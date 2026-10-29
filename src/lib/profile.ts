import { itemById, type Equipment, type Item } from "@/lib/items";
import { validateDisplayName, type NameCheck } from "@/lib/leaderboard";
import type { MuscleLevel } from "@/lib/muscle-levels";
import { rankForLevel, type Rank } from "@/lib/ranks";
import type { Stat } from "@/lib/stats";
import type { TitleStatus } from "@/lib/titles";

/**
 * Player profiles. A profile has a username (its address), a display name, a short bio and a visibility:
 * private, or visible to other signed in users. On top of that every section can be switched off. What
 * others can see is decided here, on the server, from a snapshot of the owner's own data, so a section that
 * is switched off is never even sent to the browser.
 */

export const USERNAME = { min: 3, max: 20 } as const;
export const BIO_MAX = 160;

/** Names that would look official, or that are routes of the app. */
export const RESERVED_USERNAMES: readonly string[] = [
  "admin", "administrator", "moderator", "mod", "support", "staff", "system", "official", "muscles", "leveling",
  "api", "u", "me", "you", "profile", "settings", "help", "guide", "login", "logout", "dashboard", "status",
  "collection", "leaderboard", "workouts", "body", "schedule", "membership", "www", "root", "null", "undefined",
];

export type UsernameCheck = { ok: true; username: string } | { ok: false; message: string };

/** A username: lowercase letters, digits and underscores, 3 to 20 long, not starting with an underscore. */
export function validateUsername(raw: unknown): UsernameCheck {
  if (typeof raw !== "string") return { ok: false, message: "Choose a username." };
  const username = raw.trim().replace(/^@/, "").toLowerCase();
  if (username.length < USERNAME.min) return { ok: false, message: `Use at least ${USERNAME.min} characters.` };
  if (username.length > USERNAME.max) return { ok: false, message: `Use at most ${USERNAME.max} characters.` };
  if (!/^[a-z0-9_]+$/.test(username)) return { ok: false, message: "Use letters, numbers and underscores only." };
  if (username.startsWith("_")) return { ok: false, message: "Start with a letter or a number." };
  if (/^[0-9_]+$/.test(username)) return { ok: false, message: "Include at least one letter." };
  if (RESERVED_USERNAMES.includes(username)) return { ok: false, message: "That username is kept. Pick another." };
  return { ok: true, username };
}

export const validateProfileName = (raw: unknown): NameCheck => validateDisplayName(raw);

export type BioCheck = { ok: true; bio: string | null } | { ok: false; message: string };

/** A short line about yourself, plain text on one line. Empty means none. */
export function validateBio(raw: unknown): BioCheck {
  if (raw === null || raw === undefined) return { ok: true, bio: null };
  if (typeof raw !== "string") return { ok: false, message: "The bio has to be text." };
  // One line: line breaks become spaces, and control characters are dropped.
  const bio = raw.replace(/[\r\n\t]+/g, " ").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (bio.length > BIO_MAX) return { ok: false, message: `Use at most ${BIO_MAX} characters.` };
  return { ok: true, bio: bio === "" ? null : bio };
}

export type Visibility = "private" | "members";

export const VISIBILITIES: readonly { id: Visibility; name: string; hint: string }[] = [
  { id: "private", name: "Private", hint: "Only you can open your profile." },
  { id: "members", name: "Signed-in users", hint: "Anyone with an account can open it. It is never on the open internet." },
];

export const isVisibility = (v: unknown): v is Visibility => v === "private" || v === "members";

/** The parts of a profile that can each be shown or hidden. */
export type SectionId = "level" | "stats" | "collection" | "titles" | "muscles" | "activity";

export const SECTIONS: readonly { id: SectionId; name: string; hint: string }[] = [
  { id: "level", name: "Rank and level", hint: "Your level, rank badge, XP and the title you wear." },
  { id: "stats", name: "Stats", hint: "The five stats and their shape." },
  { id: "collection", name: "Collection", hint: "The items you found in chests and the ones you wear." },
  { id: "titles", name: "Titles", hint: "Which titles you earned." },
  { id: "muscles", name: "Muscle levels", hint: "A level for every muscle." },
  { id: "activity", name: "Activity", hint: "Finished workouts, longest streak, quests and gates." },
];

export type SectionFlags = Record<SectionId, boolean>;

/** New profiles show everything once they are made visible, and start out private. */
export const DEFAULT_SECTIONS: SectionFlags = { level: true, stats: true, collection: true, titles: true, muscles: true, activity: true };

/** Read from the database or a request: anything missing or not a boolean counts as the default. */
export function parseSections(raw: unknown): SectionFlags {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(SECTIONS.map((s) => [s.id, typeof source[s.id] === "boolean" ? source[s.id] : DEFAULT_SECTIONS[s.id]])) as SectionFlags;
}

/** What a profile can never show, whatever the settings. Said plainly in Settings. */
export const NEVER_SHARED: readonly string[] = [
  "Your weight",
  "Your progress photos",
  "Your gym, its location and your membership",
  "Your check-ins, moods and notes",
  "Your email address",
];

export type ProfileActivity = {
  workouts: number;
  longestStreak: number;
  questsCompleted: number;
  gatesCleared: number;
  volumeKg: number;
};

/**
 * Everything a profile could show, worked out by the server from the owner's data and stored as it is.
 * Which parts others see is decided later, when it is read.
 */
export type ProfileSnapshot = {
  v: 1;
  level: number;
  xp: number;
  title: string | null;
  stats: { name: string; value: number }[];
  /** Ids of the titles earned. */
  titlesEarned: string[];
  /** Ids of the items owned, and which are worn. */
  owned: string[];
  equipment: Equipment;
  muscles: { muscle: string; label: string; level: number; weighted: number; progress: number }[];
  activity: ProfileActivity;
  /** The first day with any activity. */
  firstDate: string | null;
  updatedAt: string;
};

/** The pieces of the game state a snapshot is made from. */
export type SnapshotSource = {
  levelNumber: number;
  xp: number;
  title: string | null;
  stats: Pick<Stat, "name" | "value">[];
  titles: Pick<TitleStatus, "id" | "earned">[];
  owned: string[];
  equipment: Equipment;
  muscles: MuscleLevel[];
  activity: ProfileActivity;
  firstDate: string | null;
};

export function buildSnapshot(source: SnapshotSource, now: Date = new Date()): ProfileSnapshot {
  return {
    v: 1,
    level: source.levelNumber,
    xp: source.xp,
    title: source.title,
    stats: source.stats.map((s) => ({ name: s.name, value: s.value })),
    titlesEarned: source.titles.filter((t) => t.earned).map((t) => t.id),
    owned: [...source.owned],
    equipment: { ...source.equipment },
    muscles: source.muscles.map((m) => ({ muscle: m.muscle, label: m.label, level: m.level, weighted: m.weighted, progress: m.progress })),
    activity: { ...source.activity },
    firstDate: source.firstDate,
    updatedAt: now.toISOString(),
  };
}

/** A profile as stored. */
export type Profile = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  visibility: Visibility;
  sections: SectionFlags;
  snapshot: ProfileSnapshot | null;
  created_at: string;
  updated_at: string;
};

/** What a viewer gets to see. A part that is not allowed is null, so it never leaves the server. */
export type PublicProfile = {
  username: string;
  displayName: string;
  bio: string | null;
  isOwner: boolean;
  /** Which sections others can see. The owner sees all of them and uses this to tell which are hidden. */
  shared: SectionFlags;
  visibility: Visibility;
  level: { level: number; rank: Rank; xp: number; title: string | null } | null;
  stats: { name: string; value: number }[] | null;
  collection: { owned: Item[]; worn: Partial<Record<"frame" | "aura" | "plate" | "look", Item>> } | null;
  titles: string[] | null;
  muscles: ProfileSnapshot["muscles"] | null;
  activity: (ProfileActivity & { firstDate: string | null }) | null;
  updatedAt: string | null;
};

/**
 * The profile a viewer may see, or null when they may not (private, and not the owner). The owner sees every
 * section. Someone else sees only the sections that are switched on. Equipment is checked against what is owned,
 * so a worn item nobody owns never shows.
 */
export function toPublicProfile(
  profile: Pick<Profile, "username" | "display_name" | "bio" | "visibility" | "sections" | "snapshot">,
  viewerIsOwner: boolean,
): PublicProfile | null {
  if (!viewerIsOwner && profile.visibility !== "members") return null;
  const snap = profile.snapshot;
  const allowed = (id: SectionId) => viewerIsOwner || profile.sections[id];

  const owned = snap ? snap.owned.map((id) => itemById(id)).filter((i): i is Item => i !== null) : [];
  const ownedIds = new Set(owned.map((i) => i.id));
  const worn: Partial<Record<"frame" | "aura" | "plate" | "look", Item>> = {};
  if (snap) {
    for (const slot of ["frame", "aura", "plate", "look"] as const) {
      const id = snap.equipment[slot];
      const item = id ? itemById(id) : null;
      if (item && item.slot === slot && ownedIds.has(item.id)) worn[slot] = item;
    }
  }

  return {
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio,
    isOwner: viewerIsOwner,
    shared: profile.sections,
    visibility: profile.visibility,
    level: snap && allowed("level") ? { level: snap.level, rank: rankForLevel(snap.level), xp: snap.xp, title: snap.title } : null,
    stats: snap && allowed("stats") ? snap.stats : null,
    collection: snap && allowed("collection") ? { owned, worn } : null,
    titles: snap && allowed("titles") ? snap.titlesEarned : null,
    muscles: snap && allowed("muscles") ? snap.muscles : null,
    activity: snap && allowed("activity") ? { ...snap.activity, firstDate: snap.firstDate } : null,
    updatedAt: snap?.updatedAt ?? null,
  };
}
