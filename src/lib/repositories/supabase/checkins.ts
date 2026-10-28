import "server-only";
import type { Checkin } from "@/lib/types";
import type { CheckinInput } from "@/lib/validation/checkin";
import { check, fetchAll, getDb, isUuid, numOrNull } from "./db";
import { listEntryFilePaths, removeStoredFiles } from "./logPhotos";

const COLUMNS = "id,user_id,date,kind,mood,energy,sleep_hours,notes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCheckin = (r: any): Checkin => ({
  id: r.id,
  user_id: r.user_id,
  date: r.date,
  kind: r.kind,
  mood: r.mood,
  energy: r.energy,
  sleep_hours: numOrNull(r.sleep_hours),
  notes: r.notes,
});

export async function listCheckins(userId: string): Promise<Checkin[]> {
  const db = await getDb();
  const rows = await fetchAll((from, to) =>
    db.from("daily_checkins").select(COLUMNS).eq("user_id", userId).order("date", { ascending: false }).range(from, to),
  );
  return rows.map(toCheckin);
}

/** One check-in per user per day: saving the same date replaces the entry. */
export async function upsertCheckin(userId: string, input: CheckinInput): Promise<Checkin> {
  const db = await getDb();
  const { data, error } = await db
    .from("daily_checkins")
    .upsert(
      {
        user_id: userId,
        date: input.date,
        kind: input.kind,
        mood: input.mood ?? null,
        energy: input.energy ?? null,
        sleep_hours: input.sleep_hours ?? null,
        notes: input.notes ?? null,
      },
      { onConflict: "user_id,date" },
    )
    .select(COLUMNS)
    .single();
  check(error);
  return toCheckin(data);
}

export async function deleteCheckin(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const db = await getDb();
  // Photo rows go with the check-in (on delete cascade). Their files do not, so collect them first.
  const files = await listEntryFilePaths(userId, "checkin", id);
  const { data, error } = await db.from("daily_checkins").delete().eq("id", id).eq("user_id", userId).select("id");
  check(error);
  if ((data?.length ?? 0) === 0) return false;
  await removeStoredFiles(files);
  return true;
}

export async function getCheckinByDate(userId: string, date: string): Promise<Checkin | null> {
  const db = await getDb();
  const { data, error } = await db
    .from("daily_checkins")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  check(error);
  return data ? toCheckin(data) : null;
}
