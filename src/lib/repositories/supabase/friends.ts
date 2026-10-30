import "server-only";
import { MAX_FRIENDS, type FriendCard, type FriendLink, type WeekDamage } from "@/lib/friends";
import type { AcceptResult, CreateCardResult, DamageRow, LinkResult } from "@/lib/repositories/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { check, isUniqueViolation, isUuid } from "./db";

/**
 * Friends read other people's rows (a friend's name and damage), and the row level security policies only let an owner
 * read their own, so everything here uses the service role. That is safe because it stays on the server: the routes and pages
 * that call it only ever ask about the signed in user's own friendships, and only a name, a level and weekly damage are returned.
 */

/** Postgres "undefined table" and PostgREST "not in the schema cache": the migration has not run yet. */
const isMissingTable = (error: { code?: string } | null) => error?.code === "42P01" || error?.code === "PGRST205";

export async function getCard(userId: string): Promise<{ available: boolean; card: FriendCard | null }> {
  if (!isUuid(userId)) return { available: false, card: null };
  const { data, error } = await createAdminClient().from("friend_codes").select("code,name,level").eq("user_id", userId).maybeSingle();
  if (isMissingTable(error)) return { available: false, card: null };
  check(error);
  return { available: true, card: data ? { code: data.code, name: data.name, level: Number(data.level) } : null };
}

export async function createCard(userId: string, card: FriendCard): Promise<CreateCardResult> {
  if (!isUuid(userId)) return { ok: false, reason: "unavailable" };
  const { error } = await createAdminClient().from("friend_codes").insert({ user_id: userId, ...card });
  if (isMissingTable(error)) return { ok: false, reason: "unavailable" };
  // Either the code collided (try another) or this user already has a card, which the caller checked first.
  if (isUniqueViolation(error)) return { ok: false, reason: "code_taken" };
  check(error);
  return { ok: true };
}

export async function updateCard(userId: string, patch: Partial<Pick<FriendCard, "name" | "level">>): Promise<void> {
  if (!isUuid(userId)) return;
  const { error } = await createAdminClient()
    .from("friend_codes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (isMissingTable(error)) return;
  check(error);
}

export async function findByCode(code: string): Promise<string | null> {
  const { data, error } = await createAdminClient().from("friend_codes").select("user_id").eq("code", code).maybeSingle();
  if (isMissingTable(error)) return null;
  check(error);
  return data?.user_id ?? null;
}

export async function listLinks(userId: string): Promise<FriendLink[]> {
  if (!isUuid(userId)) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("friendships")
    .select("id,requester_id,addressee_id,status,accepted_on")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (isMissingTable(error)) return [];
  check(error);
  const rows = data ?? [];
  const otherIds = [...new Set(rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id)))];
  if (otherIds.length === 0) return [];
  const cards = await admin.from("friend_codes").select("user_id,name,level").in("user_id", otherIds);
  check(cards.error);
  const byId = new Map((cards.data ?? []).map((c) => [c.user_id, c]));
  return rows.map((r) => {
    const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
    const card = byId.get(otherId);
    return {
      id: r.id,
      otherId,
      name: card?.name ?? "Lifter",
      level: Number(card?.level ?? 1),
      direction: r.requester_id === userId ? ("outgoing" as const) : ("incoming" as const),
      status: r.status === "accepted" ? ("accepted" as const) : ("pending" as const),
      acceptedOn: r.accepted_on ?? null,
    };
  });
}

export async function createLink(requesterId: string, addresseeId: string): Promise<LinkResult> {
  if (!isUuid(requesterId) || !isUuid(addresseeId)) return { ok: false, reason: "unavailable" };
  const { data, error } = await createAdminClient()
    .from("friendships")
    .insert({ requester_id: requesterId, addressee_id: addresseeId })
    .select("id")
    .single();
  // The unique index is on the pair, whichever way it was sent.
  if (isUniqueViolation(error)) return { ok: false, reason: "exists" };
  if (isMissingTable(error)) return { ok: false, reason: "unavailable" };
  check(error);
  return { ok: true, id: data!.id };
}

async function acceptedCount(userId: string): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  check(error);
  return count ?? 0;
}

export async function acceptLink(userId: string, id: string, today: string): Promise<AcceptResult> {
  if (!isUuid(userId) || !isUuid(id)) return "not_found";
  const admin = createAdminClient();
  const { data, error } = await admin.from("friendships").select("id,requester_id,addressee_id").eq("id", id).eq("addressee_id", userId).eq("status", "pending").maybeSingle();
  if (isMissingTable(error)) return "not_found";
  check(error);
  if (!data) return "not_found";
  if ((await acceptedCount(data.requester_id)) >= MAX_FRIENDS || (await acceptedCount(data.addressee_id)) >= MAX_FRIENDS) return "full";
  const update = await admin.from("friendships").update({ status: "accepted", accepted_on: today }).eq("id", id).eq("status", "pending").select("id");
  check(update.error);
  return (update.data?.length ?? 0) > 0 ? "accepted" : "not_found";
}

/** Removes a friendship or declines or cancels a request. Either side may do it. */
export async function removeLink(userId: string, id: string): Promise<boolean> {
  if (!isUuid(userId) || !isUuid(id)) return false;
  const { data, error } = await createAdminClient()
    .from("friendships")
    .delete()
    .eq("id", id)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .select("id");
  if (isMissingTable(error)) return false;
  check(error);
  return (data?.length ?? 0) > 0;
}

export async function saveDamage(userId: string, rows: WeekDamage[]): Promise<void> {
  if (!isUuid(userId) || rows.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("weekly_boss_damage")
    .upsert(rows.map((r) => ({ user_id: userId, week_start: r.week_start, damage: r.damage, updated_at: now })), { onConflict: "user_id,week_start" });
  if (isMissingTable(error)) return;
  check(error);
}

export async function listDamage(userIds: string[], fromWeek: string): Promise<DamageRow[]> {
  const ids = userIds.filter(isUuid);
  if (ids.length === 0) return [];
  const { data, error } = await createAdminClient().from("weekly_boss_damage").select("user_id,week_start,damage").in("user_id", ids).gte("week_start", fromWeek);
  if (isMissingTable(error)) return [];
  check(error);
  return (data ?? []).map((r) => ({ user_id: r.user_id, week_start: r.week_start, damage: Number(r.damage) }));
}

/** Removes a card, its friendships and its damage. The foreign keys remove the rest when the account goes. */
export async function deleteCard(userId: string): Promise<void> {
  if (!isUuid(userId)) return;
  const admin = createAdminClient();
  const links = await admin.from("friendships").delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (!isMissingTable(links.error)) check(links.error);
  const damage = await admin.from("weekly_boss_damage").delete().eq("user_id", userId);
  if (!isMissingTable(damage.error)) check(damage.error);
  const card = await admin.from("friend_codes").delete().eq("user_id", userId);
  if (!isMissingTable(card.error)) check(card.error);
}
