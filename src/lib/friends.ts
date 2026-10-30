import { awakened, MONSTERS, type Monster } from "@/lib/battle/monsters";
import type { Chest } from "@/lib/chests";
import { CHEST_EXPIRY_DAYS } from "@/lib/chests";
import { addDaysISO, weekRange } from "@/lib/week";

/**
 * Friends and the friends boss. Two players become friends with a friend code and an accepted request. Each player then
 * fights a weekly boss together with their accepted friends: every member's gate damage for the week counts toward one
 * shared HP bar. Beating it earns a chest, a better one for the three who dealt the most.
 *
 * Only a nickname, a level and the damage per week are ever shared with a friend, and only the server writes them.
 */

/** Most friends one player can have, and so the largest group is this plus the player. */
export const MAX_FRIENDS = 10;

/** The first week with a friends boss (a Monday). Nothing is handed out for earlier weeks. */
export const FRIEND_BOSS_START_DATE = "2026-10-26";

/** The boss's HP is this share of what the group dealt in its recent weeks. */
export const FRIEND_BOSS_HP_FACTOR = 0.8;
/** However little the group did before, each member adds at least this much HP, so a small group has a real fight. */
export const FRIEND_BOSS_MIN_HP_PER_MEMBER = 2500;
/** How many earlier weeks count for the HP. */
export const FRIEND_BOSS_HISTORY_WEEKS = 4;

/** The three who dealt the most get the better chest, but only in a group of at least four. */
export const MVP_PLACES = 3;
export const MVP_MIN_GROUP = 4;

/** How many weeks back a chest can still be open, so older weeks never need to be loaded. */
export const FRIEND_WEEKS_BACK = 4;

/** Letters and digits without the look alikes (0 and O, 1 and I), so a code is easy to read out. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const FRIEND_CODE_LENGTH = 8;

/** A new friend code, from `rng`, a source of numbers in [0, 1). */
export function generateFriendCode(rng: () => number): string {
  let code = "";
  for (let i = 0; i < FRIEND_CODE_LENGTH; i++) code += CODE_ALPHABET[Math.min(CODE_ALPHABET.length - 1, Math.floor(rng() * CODE_ALPHABET.length))];
  return code;
}

/** How a code is shown: `ABCD-EFGH`. */
export const formatFriendCode = (code: string): string => `${code.slice(0, 4)}-${code.slice(4)}`;

/** A code as typed (any case, with a dash or spaces) turned into the stored form, or null when it cannot be a code. */
export function normalizeFriendCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== FRIEND_CODE_LENGTH) return null;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return null;
  return code;
}

/** A name for someone who has not chosen one: stable and not a user id. */
export const defaultFriendName = (code: string): string => `Lifter ${code.slice(0, 4)}`;

/** Your own friend card: the code others type to add you, and the name and level they see. */
export type FriendCard = { code: string; name: string; level: number };

/** One friendship or request, from your side. `otherId` never leaves the server. */
export type FriendLink = {
  id: string;
  otherId: string;
  name: string;
  level: number;
  /** Whether you sent the request (outgoing) or got it (incoming). */
  direction: "incoming" | "outgoing";
  status: "pending" | "accepted";
  /** The day it was accepted, or null while pending. */
  acceptedOn: string | null;
};

/** The damage a player dealt in a week. */
export type WeekDamage = { week_start: string; damage: number };

/** The Monday a friend starts to count for the boss: the week after the day the request was accepted. */
export const countsFromWeek = (acceptedOn: string): string => addDaysISO(weekRange(acceptedOn).start, 7);

/** One member of a group: you or an accepted friend. */
export type BossMember = {
  userId: string;
  name: string;
  level: number;
  /** Damage by week (the Monday), from what the member's own sets did. */
  weeks: Record<string, number>;
  /** The Monday from which this member counts for the group. Members who joined mid week start the next week. */
  since: string;
  /** Whether this is the player looking at the boss. */
  isMe: boolean;
};

export type MemberResult = {
  userId: string;
  name: string;
  level: number;
  damage: number;
  /** Share of the group's damage, 0 to 1. */
  share: number;
  /** 1 for the most damage. A member with none is unranked (0). */
  place: number;
  isMe: boolean;
};

export type FriendBoss = {
  weekStart: string;
  weekEnd: string;
  monster: Monster;
  hp: number;
  damage: number;
  hpLeft: number;
  /** 0 to 1. */
  progress: number;
  cleared: boolean;
  /** The week is over. */
  over: boolean;
  members: MemberResult[];
};

/** The monster of a week: one of the six, awakened, in turn. It is the same for the whole group. */
export function friendMonsterFor(weekStart: string): Monster {
  const index = Math.floor(Date.parse(weekStart) / (7 * 86_400_000));
  // Offset by half a cycle so it is rarely the same one as that week's gate or the month's season boss.
  return awakened(MONSTERS[(index + 3) % MONSTERS.length]);
}

/** A member's average weekly damage over the weeks before `weekStart`, counting only weeks they trained. */
function recentAverage(member: BossMember, weekStart: string): number {
  const earlier = Object.entries(member.weeks)
    .filter(([week, damage]) => week < weekStart && damage > 0)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, FRIEND_BOSS_HISTORY_WEEKS)
    .map(([, damage]) => damage);
  return earlier.length === 0 ? 0 : earlier.reduce((sum, d) => sum + d, 0) / earlier.length;
}

/** The group of a week: the members who had joined by its Monday. */
const groupOf = (members: readonly BossMember[], weekStart: string) => members.filter((m) => m.since <= weekStart);

/** The boss HP of a week for a group. */
export function friendBossHp(members: readonly BossMember[], weekStart: string): number {
  const group = groupOf(members, weekStart);
  const base = group.reduce((sum, m) => sum + recentAverage(m, weekStart), 0);
  const raw = Math.max(group.length * FRIEND_BOSS_MIN_HP_PER_MEMBER, base * FRIEND_BOSS_HP_FACTOR);
  return Math.max(100, Math.round(raw / 100) * 100);
}

/**
 * The shared fight of one week. `members` includes the player. The group is fixed at the Monday, so a friend added or
 * removed in the middle of the week changes nothing until the next one. A player with no friends has no boss (null).
 */
export function friendBossFor(members: readonly BossMember[], weekStart: string, today: string): FriendBoss | null {
  const group = groupOf(members, weekStart);
  if (group.length < 2 || weekStart < FRIEND_BOSS_START_DATE) return null;

  const hp = friendBossHp(members, weekStart);
  const damages = group.map((m) => ({ m, damage: Math.max(0, Math.round(m.weeks[weekStart] ?? 0)) }));
  const total = damages.reduce((sum, d) => sum + d.damage, 0);
  const ranked = [...damages].sort((a, b) => b.damage - a.damage || a.m.name.localeCompare(b.m.name) || a.m.userId.localeCompare(b.m.userId));
  const results: MemberResult[] = ranked.map(({ m, damage }, i) => ({
    userId: m.userId,
    name: m.name,
    level: m.level,
    damage,
    share: total > 0 ? damage / total : 0,
    place: damage > 0 ? i + 1 : 0,
    isMe: m.isMe,
  }));
  const weekEnd = weekRange(weekStart).end;
  const progress = Math.min(1, total / hp);
  return {
    weekStart,
    weekEnd,
    monster: friendMonsterFor(weekStart),
    hp,
    damage: total,
    hpLeft: Math.max(0, hp - total),
    progress,
    cleared: total >= hp,
    over: today > weekEnd,
    members: results,
  };
}

/** The Mondays of the weeks that are over and still count for a chest, oldest first. */
export function finishedWeeks(today: string): string[] {
  const current = weekRange(today).start;
  const weeks: string[] = [];
  for (let i = FRIEND_WEEKS_BACK; i >= 1; i--) {
    const week = addDaysISO(current, -7 * i);
    if (week >= FRIEND_BOSS_START_DATE) weeks.push(week);
  }
  return weeks;
}

/**
 * The chests a player earned from the weeks that are over: a friends chest for everyone who dealt damage to a boss that fell,
 * and the better one for the three who dealt the most. Dated the Monday after the week, when it is settled.
 */
export function friendChests(members: readonly BossMember[], today: string, opened: ReadonlySet<string> = new Set()): Chest[] {
  const chests: Chest[] = [];
  for (const week of finishedWeeks(today)) {
    // A week pays one chest. If one is already open, a late change of the ranking cannot pay a second.
    if (opened.has(`f:${week}`) || opened.has(`t:${week}`)) {
      const kind = opened.has(`t:${week}`) ? "mvp" : "friends";
      const earnedOn = addDaysISO(week, 7);
      chests.push({ id: `${kind === "mvp" ? "t" : "f"}:${week}`, kind, earnedOn, expiresOn: addDaysISO(earnedOn, CHEST_EXPIRY_DAYS[kind]) });
      continue;
    }
    const boss = friendBossFor(members, week, today);
    if (!boss || !boss.cleared) continue;
    const mine = boss.members.find((m) => m.isMe);
    if (!mine || mine.damage <= 0) continue;
    const mvp = mine.place >= 1 && mine.place <= MVP_PLACES && boss.members.length >= MVP_MIN_GROUP;
    const kind = mvp ? "mvp" : "friends";
    const earnedOn = addDaysISO(week, 7);
    chests.push({ id: `${mvp ? "t" : "f"}:${week}`, kind, earnedOn, expiresOn: addDaysISO(earnedOn, CHEST_EXPIRY_DAYS[kind]) });
  }
  return chests;
}

/** A day by day damage map turned into damage per week (the Monday). */
export function weeklyDamage(days: ReadonlyMap<string, number>): Record<string, number> {
  const weeks: Record<string, number> = {};
  for (const [date, damage] of days) {
    const week = weekRange(date).start;
    weeks[week] = (weeks[week] ?? 0) + damage;
  }
  for (const week of Object.keys(weeks)) weeks[week] = Math.round(weeks[week]);
  return weeks;
}

/** The group of a player: themselves, from their own live numbers, and their accepted friends, from what the server stored. */
export function buildMembers(input: {
  me: { userId: string; name: string; level: number; weeks: Record<string, number> };
  links: readonly FriendLink[];
  damage: readonly { user_id: string; week_start: string; damage: number }[];
}): BossMember[] {
  const members: BossMember[] = [{ ...input.me, since: "0000-00-00", isMe: true }];
  for (const link of input.links) {
    if (link.status !== "accepted" || !link.acceptedOn) continue;
    const weeks: Record<string, number> = {};
    for (const row of input.damage) if (row.user_id === link.otherId) weeks[row.week_start] = row.damage;
    members.push({ userId: link.otherId, name: link.name, level: link.level, weeks, since: countsFromWeek(link.acceptedOn), isMe: false });
  }
  return members;
}

/** The earliest week whose damage is needed: the oldest chest week and the weeks before it that its HP counts. */
export const damageFromWeek = (today: string): string => addDaysISO(weekRange(today).start, -7 * (FRIEND_WEEKS_BACK + FRIEND_BOSS_HISTORY_WEEKS));
