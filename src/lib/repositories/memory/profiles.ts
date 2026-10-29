import "server-only";
import { buildSnapshot, DEFAULT_SECTIONS, type Profile, type ProfileSnapshot } from "@/lib/profile";
import { muscleLevels } from "@/lib/muscle-levels";
import { NO_EQUIPMENT } from "@/lib/items";
import type { SaveProfileResult } from "@/lib/repositories/types";
import { nameTakenOnBoard } from "./leaderboard";

/** One table for everyone, since a profile is read by other users. Demo mode only. */
const g = globalThis as unknown as { __gymProfiles?: Map<string, Profile> };

/** A snapshot for a sample player: a level, five stats, some items and a few trained muscles. */
function sampleSnapshot(level: number, stats: number[], owned: string[], equipment: Partial<typeof NO_EQUIPMENT>, trained: Record<string, number>): ProfileSnapshot {
  const names = ["Strength", "Endurance", "Vitality", "Agility", "Discipline"];
  const exercises = Object.keys(trained).map((muscle) => ({ id: muscle, primary_muscle: muscle as never, secondary_muscles: [] }));
  const sets = Object.entries(trained).flatMap(([muscle, count]) => Array.from({ length: count }, () => ({ exercise_id: muscle })));
  return buildSnapshot({
    levelNumber: level,
    xp: Math.round(((level - 1) * (level + 24)) / 2),
    title: level >= 60 ? "Iron Regular" : level >= 20 ? "Quest Runner" : null,
    stats: names.map((name, i) => ({ name, value: stats[i] })),
    titles: [
      { id: "firststeps", earned: true },
      { id: "runner", earned: level >= 20 },
      { id: "regular", earned: level >= 60 },
    ],
    owned,
    equipment: { ...NO_EQUIPMENT, ...equipment },
    muscles: muscleLevels(sets, exercises),
    activity: { workouts: level * 2, longestStreak: Math.floor(level / 3), questsCompleted: level * 3, gatesCleared: Math.floor(level / 12), volumeKg: level * 2400 },
    firstDate: "2026-09-12",
  });
}

/** Sample players, so the profile pages can be tried in demo mode. They match the sample leaderboard rows. */
function samples(): Map<string, Profile> {
  const make = (user_id: string, username: string, display_name: string, bio: string | null, visibility: Profile["visibility"], sections: Partial<Profile["sections"]>, snapshot: ProfileSnapshot): Profile => ({
    user_id,
    username,
    display_name,
    bio,
    visibility,
    sections: { ...DEFAULT_SECTIONS, ...sections },
    snapshot,
    created_at: "2026-09-12T00:00:00.000Z",
    updated_at: "2026-10-28T00:00:00.000Z",
  });
  const all = [
    make(
      "sample-0",
      "ayu_pratama",
      "Ayu Pratama",
      "Squat first, talk later.",
      "members",
      {},
      sampleSnapshot(62, [74, 66, 58, 49, 71], ["frame-cobalt", "frame-runic", "aura-gilded", "aura-frost", "plate-grinder", "plate-ironclad", "look-ember"], { frame: "frame-runic", aura: "aura-gilded", plate: "plate-grinder" }, { quads: 180, glutes: 150, hamstrings: 90, chest: 60, lats: 70, abs: 40 }),
    ),
    make("sample-1", "budi_santoso", "Budi Santoso", "Private for now.", "private", {}, sampleSnapshot(48, [52, 49, 41, 33, 44], ["aura-mint"], { aura: "aura-mint" }, { chest: 120, triceps: 80 })),
    make(
      "sample-4",
      "jordan_reyes",
      "Jordan Reyes",
      "Showing my collection, keeping the numbers to myself.",
      "members",
      { stats: false, activity: false, muscles: false },
      sampleSnapshot(76, [88, 80, 70, 64, 82], ["frame-apex", "frame-hex", "frame-steel", "aura-sovereign", "aura-rose", "plate-ascendant", "look-aurora"], { frame: "frame-apex", aura: "aura-sovereign", plate: "plate-ascendant" }, { chest: 260, lats: 240, quads: 300 }),
    ),
    make("sample-6", "mia_h", "Mia Hoffmann", null, "members", { collection: false }, sampleSnapshot(55, [60, 58, 52, 47, 56], ["aura-violet"], {}, { quads: 100, calves: 60, abs: 90 })),
  ];
  return new Map(all.map((p) => [p.user_id, p]));
}

const profiles = () => (g.__gymProfiles ??= samples());

/** Test helper: back to the sample players only. */
export function resetProfiles() {
  g.__gymProfiles = undefined;
}

export async function getProfile(userId: string): Promise<{ available: boolean; profile: Profile | null }> {
  return { available: true, profile: profiles().get(userId) ?? null };
}

export async function getProfileByUsername(username: string): Promise<{ available: boolean; profile: Profile | null }> {
  const wanted = username.toLowerCase();
  return { available: true, profile: [...profiles().values()].find((p) => p.username.toLowerCase() === wanted) ?? null };
}

export async function usernameTaken(username: string, exceptUserId: string): Promise<boolean> {
  const wanted = username.toLowerCase();
  return [...profiles().values()].some((p) => p.user_id !== exceptUserId && p.username.toLowerCase() === wanted);
}

/** A display name is taken by another profile or by another leaderboard entry. */
export async function displayNameTaken(name: string, exceptUserId: string): Promise<boolean> {
  const wanted = name.toLowerCase();
  if ([...profiles().values()].some((p) => p.user_id !== exceptUserId && p.display_name.toLowerCase() === wanted)) return true;
  return nameTakenOnBoard(name, exceptUserId);
}

export async function saveProfile(
  userId: string,
  input: Pick<Profile, "username" | "display_name" | "bio" | "visibility" | "sections">,
): Promise<SaveProfileResult> {
  if (await usernameTaken(input.username, userId)) return { ok: false, reason: "username_taken" };
  if (await displayNameTaken(input.display_name, userId)) return { ok: false, reason: "name_taken" };
  const existing = profiles().get(userId);
  const now = new Date().toISOString();
  const profile: Profile = {
    user_id: userId,
    ...input,
    snapshot: existing?.snapshot ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  profiles().set(userId, profile);
  return { ok: true, profile };
}

/** Stores the snapshot of an existing profile. Does nothing when there is no profile. */
export async function saveSnapshot(userId: string, snapshot: ProfileSnapshot): Promise<void> {
  const existing = profiles().get(userId);
  if (existing) profiles().set(userId, { ...existing, snapshot });
}

export async function deleteProfile(userId: string): Promise<boolean> {
  return profiles().delete(userId);
}

/** User id to username, for the users whose profile other people may open. */
export async function visibleUsernames(userIds: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const id of userIds) {
    const p = profiles().get(id);
    if (p && p.visibility === "members") result[id] = p.username;
  }
  return result;
}
