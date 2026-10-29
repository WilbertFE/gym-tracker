import "server-only";
import { parseSections, type Profile, type ProfileSnapshot } from "@/lib/profile";
import type { SaveProfileResult } from "@/lib/repositories/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { check, isUniqueViolation, isUuid } from "./db";

/**
 * Profiles are read by other users, and the row level security policy only lets an owner read their own row, so
 * every read and write here uses the service role. That is safe because it stays on the server: the pages and
 * routes that call it decide what the viewer may see (`toPublicProfile` in src/lib/profile.ts) before anything is sent.
 */
const COLUMNS = "user_id,username,display_name,bio,visibility,sections,snapshot,created_at,updated_at";

/** Postgres "undefined table" and PostgREST "not in the schema cache": the migration has not run yet. */
const isMissingTable = (error: { code?: string } | null) => error?.code === "42P01" || error?.code === "PGRST205";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProfile = (r: any): Profile => ({
  user_id: r.user_id,
  username: r.username,
  display_name: r.display_name,
  bio: r.bio ?? null,
  visibility: r.visibility === "members" ? "members" : "private",
  sections: parseSections(r.sections),
  snapshot: (r.snapshot as ProfileSnapshot | null) ?? null,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

/** Escapes the characters that mean something in a LIKE pattern, so a name is matched exactly. */
const exact = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function getProfile(userId: string): Promise<{ available: boolean; profile: Profile | null }> {
  if (!isUuid(userId)) return { available: false, profile: null };
  const { data, error } = await createAdminClient().from("player_profiles").select(COLUMNS).eq("user_id", userId).maybeSingle();
  if (isMissingTable(error)) return { available: false, profile: null };
  check(error);
  return { available: true, profile: data ? toProfile(data) : null };
}

export async function getProfileByUsername(username: string): Promise<{ available: boolean; profile: Profile | null }> {
  // Usernames are stored in lowercase, and the pattern is matched exactly.
  const { data, error } = await createAdminClient().from("player_profiles").select(COLUMNS).ilike("username", exact(username)).limit(1).maybeSingle();
  if (isMissingTable(error)) return { available: false, profile: null };
  check(error);
  return { available: true, profile: data ? toProfile(data) : null };
}

export async function usernameTaken(username: string, exceptUserId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from("player_profiles").select("user_id").ilike("username", exact(username)).neq("user_id", exceptUserId).limit(1);
  if (isMissingTable(error)) return false;
  check(error);
  return (data?.length ?? 0) > 0;
}

/** A display name is taken by another profile or by another leaderboard entry. */
export async function displayNameTaken(name: string, exceptUserId: string): Promise<boolean> {
  const admin = createAdminClient();
  for (const table of ["player_profiles", "leaderboard_entries"] as const) {
    const { data, error } = await admin.from(table).select("user_id").ilike("display_name", exact(name)).neq("user_id", exceptUserId).limit(1);
    if (isMissingTable(error)) continue;
    check(error);
    if ((data?.length ?? 0) > 0) return true;
  }
  return false;
}

export async function saveProfile(
  userId: string,
  input: Pick<Profile, "username" | "display_name" | "bio" | "visibility" | "sections">,
): Promise<SaveProfileResult> {
  if (!isUuid(userId)) return { ok: false, reason: "unavailable" };
  const { data, error } = await createAdminClient()
    .from("player_profiles")
    .upsert({ user_id: userId, ...input, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select(COLUMNS)
    .single();
  if (isUniqueViolation(error)) {
    // Two unique indexes can fire: the message names the one that did.
    return { ok: false, reason: /display_name/.test(String((error as { message?: string }).message)) ? "name_taken" : "username_taken" };
  }
  if (isMissingTable(error)) return { ok: false, reason: "unavailable" };
  check(error);
  return { ok: true, profile: toProfile(data) };
}

/** Stores the snapshot of an existing profile. Does nothing when there is no profile or no table. */
export async function saveSnapshot(userId: string, snapshot: ProfileSnapshot): Promise<void> {
  if (!isUuid(userId)) return;
  const { error } = await createAdminClient().from("player_profiles").update({ snapshot }).eq("user_id", userId);
  if (isMissingTable(error)) return;
  check(error);
}

export async function deleteProfile(userId: string): Promise<boolean> {
  if (!isUuid(userId)) return false;
  const { data, error } = await createAdminClient().from("player_profiles").delete().eq("user_id", userId).select("user_id");
  if (isMissingTable(error)) return false;
  check(error);
  return (data?.length ?? 0) > 0;
}

/** User id to username, for the users whose profile other people may open. */
export async function visibleUsernames(userIds: string[]): Promise<Record<string, string>> {
  const ids = [...new Set(userIds.filter(isUuid))];
  if (ids.length === 0) return {};
  const { data, error } = await createAdminClient().from("player_profiles").select("user_id,username").in("user_id", ids).eq("visibility", "members");
  if (isMissingTable(error)) return {};
  check(error);
  return Object.fromEntries((data ?? []).map((r: { user_id: string; username: string }) => [r.user_id, r.username]));
}
