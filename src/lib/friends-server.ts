import "server-only";
import { secureRandom } from "@/lib/chests";
import {
  buildMembers,
  damageFromWeek,
  defaultFriendName,
  generateFriendCode,
  type BossMember,
  type FriendCard,
  type FriendLink,
} from "@/lib/friends";
import { validateDisplayName } from "@/lib/leaderboard";
import { createCard, getCard, listDamage, listLinks, updateCard, saveDamage } from "@/lib/repositories/friends";
import { getProfile } from "@/lib/repositories/profiles";
import { weekRange, addDaysISO } from "@/lib/week";

/** What the game state needs to know about a player's friends. */
export type FriendGroup = {
  /** False until the friends migration has run. */
  available: boolean;
  /** Your own card, or null when you have not opened the Friends page yet. */
  card: FriendCard | null;
  /** You, then your accepted friends, each with their damage by week. */
  members: BossMember[];
};

/**
 * Your friends and their damage. You count with your own numbers, worked out live, and each friend with what the
 * server stored for them the last time they were in the app. Without a card there is no group.
 */
export async function loadFriendGroup(
  userId: string,
  me: { weeks: Record<string, number>; level: number },
  today: string,
  known?: { available: boolean; card: FriendCard | null },
): Promise<FriendGroup> {
  const { available, card } = known ?? (await getCard(userId));
  if (!card) return { available, card: null, members: [] };

  const links = (await listLinks(userId)).filter((l) => l.status === "accepted");
  const damage = await listDamage(links.map((l) => l.otherId), damageFromWeek(today));
  const members = buildMembers({ me: { userId, name: card.name, level: me.level, weeks: me.weeks }, links, damage });
  return { available, card, members };
}

/**
 * Brings your card up to date: your level for friends to see, and the damage of this week and the one before it. The server
 * works the numbers out from your own sets, the request carries none. Does nothing without a card.
 */
export async function syncFriendStats(userId: string, me: { weeks: Record<string, number>; level: number }, today: string): Promise<boolean> {
  const { card } = await getCard(userId);
  if (!card) return false;
  const week = weekRange(today).start;
  const rows = [week, addDaysISO(week, -7)].map((w) => ({ week_start: w, damage: Math.max(0, Math.round(me.weeks[w] ?? 0)) }));
  await Promise.all([updateCard(userId, { level: me.level }), saveDamage(userId, rows)]);
  return true;
}

export type CreateFriendCardResult = { ok: true; card: FriendCard } | { ok: false; reason: "unavailable" };

/**
 * Opens the Friends page for a player: a new code (tried again if it collides) and a name. The name is the profile's display
 * name when there is one, otherwise a neutral "Lifter ABCD" that can be changed. An existing card is returned as it is.
 */
export async function ensureFriendCard(userId: string, level: number): Promise<CreateFriendCardResult> {
  const existing = await getCard(userId);
  if (!existing.available) return { ok: false, reason: "unavailable" };
  if (existing.card) return { ok: true, card: existing.card };

  const { profile } = await getProfile(userId);
  const profileName = validateDisplayName(profile?.display_name);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateFriendCode(secureRandom);
    const card: FriendCard = { code, name: profileName.ok ? profileName.name : defaultFriendName(code), level };
    const result = await createCard(userId, card);
    if (result.ok) return { ok: true, card };
    if (result.reason === "unavailable") return { ok: false, reason: "unavailable" };
  }
  // A second tab may have made the card in the meantime.
  const again = await getCard(userId);
  return again.card ? { ok: true, card: again.card } : { ok: false, reason: "unavailable" };
}

export type { FriendLink };
