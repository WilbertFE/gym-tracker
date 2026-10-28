import "server-only";
import { addDays, format, subDays } from "date-fns";
import { DEMO_USER_ID } from "@/lib/demo";
import { ISO_FORMAT } from "@/lib/dates";
import { builtInId } from "@/lib/exercise-library";
import type {
  AvailabilityBlock,
  BodyMeasurement,
  Checkin,
  Exercise,
  LogPhoto,
  LogPhotoKind,
  Membership,
  PhotoPose,
  ProgressPhoto,
  UserSettings,
  WeightLog,
  WorkoutSession,
  WorkoutSet,
} from "@/lib/types";

/**
 * In-memory dummy store used until Supabase is connected. Only the repository
 * files in this folder touch it. Replace their bodies with Supabase queries
 * and delete this file when the database is ready.
 */
export type Store = {
  checkins: Checkin[];
  weights: WeightLog[];
  memberships: Membership[];
  /** The user's own exercises. Built-ins live in exercise-library.ts. */
  exercises: Exercise[];
  sessions: WorkoutSession[];
  sets: WorkoutSet[];
  photos: ProgressPhoto[];
  /** Photo bytes by storage_path. Stands in for a private Supabase Storage bucket. */
  files: Map<string, { bytes: Uint8Array; contentType: string }>;
  measurements: BodyMeasurement[];
  availability: AvailabilityBlock[];
  /** Photos on check-ins and weigh-ins. Their bytes live in `files` too. */
  logPhotos: LogPhoto[];
  /** null until the user saves Settings. */
  settings: UserSettings | null;
};

const g = globalThis as unknown as { __gymStore?: Map<string, Store> };
const stores = (g.__gymStore ??= new Map<string, Store>());

const iso = (d: Date) => format(d, ISO_FORMAT);

/** [exercise name, [reps, kg] per set] */
type Plan = [string, [number, number][]][];

function seedWorkouts(userId: string, now: Date) {
  const sessions: WorkoutSession[] = [];
  const sets: WorkoutSet[] = [];

  const add = (daysAgo: number, minutes: number, plan: Plan) => {
    const start = subDays(now, daysAgo);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start.getTime() + minutes * 60_000);
    const id = crypto.randomUUID();
    sessions.push({
      id,
      user_id: userId,
      date: iso(start),
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
      duration_minutes: minutes,
      notes: null,
    });
    // About three minutes per set, from the start of the workout.
    let setIndex = 0;
    for (const [name, work] of plan) {
      work.forEach(([reps, weight_kg], i) =>
        sets.push({
          id: crypto.randomUUID(),
          session_id: id,
          exercise_id: builtInId(name),
          set_number: i + 1,
          reps,
          weight_kg,
          rpe: null,
          completed_at: new Date(start.getTime() + ++setIndex * 3 * 60_000).toISOString(),
        }),
      );
    }
  };

  add(2, 62, [
    ["Barbell Bench Press", [[8, 60], [8, 60], [6, 62.5], [6, 62.5]]],
    ["Incline Dumbbell Press", [[10, 22], [10, 22], [8, 24]]],
    ["Lateral Raise", [[12, 8], [12, 8], [12, 8]]],
    ["Tricep Pushdown", [[12, 25], [12, 25], [10, 27.5]]],
  ]);
  add(4, 55, [
    ["Pull Up", [[8, 0], [7, 0], [6, 0]]],
    ["Barbell Row", [[8, 50], [8, 50], [8, 52.5]]],
    ["Lat Pulldown", [[10, 45], [10, 45], [10, 47.5]]],
    ["Barbell Curl", [[10, 25], [10, 25], [8, 27.5]]],
  ]);
  add(7, 70, [
    ["Barbell Back Squat", [[8, 80], [8, 80], [8, 82.5], [6, 85]]],
    ["Romanian Deadlift", [[10, 70], [10, 70], [10, 70]]],
    ["Leg Press", [[12, 140], [12, 140], [10, 150]]],
    ["Standing Calf Raise", [[15, 60], [15, 60], [15, 60]]],
  ]);

  return { sessions, sets };
}

const POSE_LABEL: Record<PhotoPose, string> = { front: "FRONT", side: "SIDE", back: "BACK" };

/** A labelled placeholder so the comparison view works without real photos. */
function placeholderSvg(pose: PhotoPose, date: string, build: number): Uint8Array {
  const w = 60 + build * 6;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">` +
    `<rect width="300" height="400" fill="#171a1f"/>` +
    `<circle cx="150" cy="90" r="30" fill="#2a2e36"/>` +
    `<rect x="${150 - w / 2}" y="130" width="${w}" height="150" rx="14" fill="#2a2e36"/>` +
    `<rect x="${150 - w / 2 + 8}" y="285" width="${w / 2 - 12}" height="95" fill="#2a2e36"/>` +
    `<rect x="${150 + 4}" y="285" width="${w / 2 - 12}" height="95" fill="#2a2e36"/>` +
    `<text x="150" y="30" fill="#8a8f98" font-family="monospace" font-size="14" text-anchor="middle">DEMO PLACEHOLDER</text>` +
    `<text x="150" y="388" fill="#22d3ee" font-family="monospace" font-size="16" text-anchor="middle">${POSE_LABEL[pose]} ${date}</text>` +
    `</svg>`;
  return new TextEncoder().encode(svg);
}

function seedProgress(userId: string, now: Date) {
  const photos: ProgressPhoto[] = [];
  const files: Store["files"] = new Map();
  const add = (daysAgo: number, pose: PhotoPose, build: number) => {
    const date = iso(subDays(now, daysAgo));
    const id = crypto.randomUUID();
    const path = `${userId}/${id}.svg`;
    photos.push({ id, user_id: userId, date, storage_path: path, pose });
    files.set(path, { bytes: placeholderSvg(pose, date, build), contentType: "image/svg+xml" });
  };
  add(84, "front", 3);
  add(84, "side", 3);
  add(42, "front", 2);
  add(7, "front", 1);
  add(7, "side", 1);

  const row = (
    daysAgo: number,
    m: Partial<Omit<BodyMeasurement, "id" | "user_id" | "date">>,
  ): BodyMeasurement => ({
    id: crypto.randomUUID(),
    user_id: userId,
    date: iso(subDays(now, daysAgo)),
    chest_cm: null,
    waist_cm: null,
    hips_cm: null,
    arm_cm: null,
    thigh_cm: null,
    body_fat_pct: null,
    ...m,
  });
  const measurements = [
    row(84, { chest_cm: 98, waist_cm: 84, hips_cm: 96, arm_cm: 33, thigh_cm: 56, body_fat_pct: 19 }),
    row(42, { chest_cm: 99.5, waist_cm: 82.5, arm_cm: 34, body_fat_pct: 17.5 }),
    row(7, { chest_cm: 101, waist_cm: 81, hips_cm: 95.5, arm_cm: 35, thigh_cm: 57.5, body_fat_pct: 16 }),
  ];
  return { photos, files, measurements };
}

function seedAvailability(userId: string): AvailabilityBlock[] {
  const block = (weekday: number, start_time: string, end_time: string, label: string) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    weekday,
    start_time,
    end_time,
    label,
  });
  return [
    block(1, "08:00", "12:00", "Lectures"),
    block(2, "10:00", "16:00", "Lectures"),
    block(3, "08:00", "14:00", "Lectures"),
    block(4, "10:00", "16:00", "Lectures"),
    block(5, "09:00", "12:00", "Lectures"),
  ];
}

/** One placeholder photo on a past check-in and one on the latest weigh-in. */
function seedLogPhotos(
  userId: string,
  checkins: Checkin[],
  weights: WeightLog[],
  files: Store["files"],
): LogPhoto[] {
  const make = (label: string, entry: { checkin_id?: string; weight_id?: string }): LogPhoto => {
    const id = crypto.randomUUID();
    const storage_path = `${userId}/log/${id}.svg`;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="#171a1f"/>` +
      `<text x="150" y="140" fill="#8a8f98" font-family="monospace" font-size="14" text-anchor="middle">DEMO PLACEHOLDER</text>` +
      `<text x="150" y="170" fill="#22d3ee" font-family="monospace" font-size="18" text-anchor="middle">${label}</text></svg>`;
    files.set(storage_path, { bytes: new TextEncoder().encode(svg), contentType: "image/svg+xml" });
    return {
      id,
      user_id: userId,
      checkin_id: entry.checkin_id ?? null,
      weight_id: entry.weight_id ?? null,
      storage_path,
      created_at: new Date().toISOString(),
    };
  };
  const photos: LogPhoto[] = [];
  if (checkins[1]) photos.push(make("GYM SELFIE", { checkin_id: checkins[1].id }));
  const latest = weights[weights.length - 1];
  if (latest) photos.push(make("SCALE", { weight_id: latest.id }));
  return photos;
}

/** Removes the photos (rows and files) attached to one check-in or weigh-in. */
export function removeLogPhotosFor(store: Store, kind: LogPhotoKind, entryId: string) {
  const owned = (p: LogPhoto) => (kind === "checkin" ? p.checkin_id : p.weight_id) === entryId;
  for (const p of store.logPhotos.filter(owned)) store.files.delete(p.storage_path);
  store.logPhotos = store.logPhotos.filter((p) => !owned(p));
}

function seed(userId: string): Store {
  const now = new Date();
  // Today is skipped on purpose so the check-in form starts empty.
  const checkinOffsets = [1, 2, 4, 5, 6, 8, 9];
  const checkins: Checkin[] = checkinOffsets.map((o, i) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    date: iso(subDays(now, o)),
    went_to_gym: i % 3 !== 0,
    mood: 3 + (i % 3),
    energy: 2 + (i % 4),
    sleep_hours: 6 + (i % 3) * 0.5,
    notes: null,
  }));

  const weights: WeightLog[] = Array.from({ length: 10 }, (_, i) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    date: iso(subDays(now, (9 - i) * 7)),
    weight_kg: Math.round((72.4 - i * 0.35 + (i % 2) * 0.3) * 10) / 10,
    notes: null,
  }));

  const memberships: Membership[] = [
    {
      id: crypto.randomUUID(),
      user_id: userId,
      gym_name: "Demo Fitness Club",
      location: "Central Branch, Main Street",
      latitude: -6.2088,
      longitude: 106.8456,
      start_date: iso(subDays(now, 70)),
      end_date: iso(addDays(now, 18)),
      price: 350000,
      currency: "IDR",
      notes: null,
    },
  ];

  const { sessions, sets } = seedWorkouts(userId, now);
  const { photos, files, measurements } = seedProgress(userId, now);
  return {
    checkins,
    weights,
    memberships,
    exercises: [],
    sessions,
    sets,
    photos,
    files,
    measurements,
    availability: seedAvailability(userId),
    logPhotos: seedLogPhotos(userId, checkins, weights, files),
    settings: null,
  };
}

const empty = (): Store => ({
  checkins: [],
  weights: [],
  memberships: [],
  exercises: [],
  sessions: [],
  sets: [],
  photos: [],
  files: new Map(),
  measurements: [],
  availability: [],
  logPhotos: [],
  settings: null,
});

export function getStore(userId: string): Store {
  let store = stores.get(userId);
  if (!store) {
    store = userId === DEMO_USER_ID ? seed(userId) : empty();
    stores.set(userId, store);
  }
  return store;
}

/** Test helper. */
export function resetStores() {
  stores.clear();
}
