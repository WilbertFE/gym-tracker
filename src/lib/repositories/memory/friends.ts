import "server-only";
import { DEMO_USER_ID } from "@/lib/demo";
import { todayISO } from "@/lib/dates";
import { MAX_FRIENDS, type FriendCard, type FriendLink, type WeekDamage } from "@/lib/friends";
import type { CreateCardResult, DamageRow, LinkResult, AcceptResult } from "@/lib/repositories/types";
import { addDaysISO, weekRange } from "@/lib/week";

type Link = { id: string; requester: string; addressee: string; status: "pending" | "accepted"; acceptedOn: string | null };
type State = { cards: Map<string, FriendCard>; links: Link[]; damage: DamageRow[] };

/** Friends are shared between users, unlike the per user stores next to this file. Demo mode only. */
const g = globalThis as unknown as { __gymFriends?: State };

/** Four sample friends for the demo user, with a few weeks of damage, so the boss has something on it in demo mode. */
function samples(): State {
  const week = weekRange(todayISO()).start;
  const friends: [string, string, number, number[]][] = [
    ["sample-f1", "Ayu Pratama", 62, [5200, 4800, 5600, 5000]],
    ["sample-f2", "Budi Santoso", 48, [3100, 3300, 2900, 3400]],
    ["sample-f3", "Citra Lestari", 24, [1500, 1800, 1200, 1600]],
    ["sample-f4", "Dimas Wijaya", 12, [900, 0, 1100, 700]],
  ];
  const cards = new Map<string, FriendCard>();
  const links: Link[] = [];
  const damage: DamageRow[] = [];
  friends.forEach(([id, name, level, earlier], i) => {
    cards.set(id, { code: `SAMP${i + 2}LEX`, name, level });
    links.push({ id: `sample-link-${i}`, requester: id, addressee: DEMO_USER_ID, status: "accepted", acceptedOn: addDaysISO(week, -35) });
    earlier.forEach((d, w) => damage.push({ user_id: id, week_start: addDaysISO(week, -7 * (w + 1)), damage: d }));
    // This week they are part way through.
    damage.push({ user_id: id, week_start: week, damage: Math.round((earlier[0] ?? 0) * (0.35 + i * 0.1)) });
  });
  return { cards, links, damage };
}

const state = () => (g.__gymFriends ??= samples());

/** Test helper: back to the sample friends. */
export function resetFriends() {
  g.__gymFriends = undefined;
}

export async function getCard(userId: string): Promise<{ available: boolean; card: FriendCard | null }> {
  return { available: true, card: state().cards.get(userId) ?? null };
}

export async function createCard(userId: string, card: FriendCard): Promise<CreateCardResult> {
  const s = state();
  if ([...s.cards.values()].some((c) => c.code === card.code)) return { ok: false, reason: "code_taken" };
  s.cards.set(userId, card);
  return { ok: true };
}

export async function updateCard(userId: string, patch: Partial<Pick<FriendCard, "name" | "level">>): Promise<void> {
  const s = state();
  const card = s.cards.get(userId);
  if (card) s.cards.set(userId, { ...card, ...patch });
}

export async function findByCode(code: string): Promise<string | null> {
  for (const [userId, card] of state().cards) if (card.code === code) return userId;
  return null;
}

export async function listLinks(userId: string): Promise<FriendLink[]> {
  const s = state();
  return s.links
    .filter((l) => l.requester === userId || l.addressee === userId)
    .map((l) => {
      const otherId = l.requester === userId ? l.addressee : l.requester;
      const card = s.cards.get(otherId);
      return {
        id: l.id,
        otherId,
        name: card?.name ?? "Lifter",
        level: card?.level ?? 1,
        direction: l.requester === userId ? ("outgoing" as const) : ("incoming" as const),
        status: l.status,
        acceptedOn: l.acceptedOn,
      };
    });
}

const accepted = (s: State, userId: string) => s.links.filter((l) => l.status === "accepted" && (l.requester === userId || l.addressee === userId)).length;

export async function createLink(requesterId: string, addresseeId: string): Promise<LinkResult> {
  const s = state();
  if (s.links.some((l) => (l.requester === requesterId && l.addressee === addresseeId) || (l.requester === addresseeId && l.addressee === requesterId))) {
    return { ok: false, reason: "exists" };
  }
  const link: Link = { id: crypto.randomUUID(), requester: requesterId, addressee: addresseeId, status: "pending", acceptedOn: null };
  s.links.push(link);
  return { ok: true, id: link.id };
}

export async function acceptLink(userId: string, id: string, today: string): Promise<AcceptResult> {
  const s = state();
  const link = s.links.find((l) => l.id === id && l.addressee === userId && l.status === "pending");
  if (!link) return "not_found";
  if (accepted(s, link.requester) >= MAX_FRIENDS || accepted(s, link.addressee) >= MAX_FRIENDS) return "full";
  link.status = "accepted";
  link.acceptedOn = today;
  return "accepted";
}

export async function removeLink(userId: string, id: string): Promise<boolean> {
  const s = state();
  const before = s.links.length;
  s.links = s.links.filter((l) => !(l.id === id && (l.requester === userId || l.addressee === userId)));
  return s.links.length < before;
}

export async function saveDamage(userId: string, rows: WeekDamage[]): Promise<void> {
  const s = state();
  for (const row of rows) {
    s.damage = s.damage.filter((d) => !(d.user_id === userId && d.week_start === row.week_start));
    s.damage.push({ user_id: userId, ...row });
  }
}

export async function listDamage(userIds: string[], fromWeek: string): Promise<DamageRow[]> {
  const wanted = new Set(userIds);
  return state().damage.filter((d) => wanted.has(d.user_id) && d.week_start >= fromWeek);
}

/** Removes everything a user has, for leaving. */
export async function deleteCard(userId: string): Promise<void> {
  const s = state();
  s.cards.delete(userId);
  s.links = s.links.filter((l) => l.requester !== userId && l.addressee !== userId);
  s.damage = s.damage.filter((d) => d.user_id !== userId);
}
