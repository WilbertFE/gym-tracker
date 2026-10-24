import "server-only";
import type { BodyMeasurement } from "@/lib/types";
import type { MeasurementInput } from "@/lib/validation/progress";
import { check, fetchAll, getDb, isUuid, numOrNull } from "./db";

const COLUMNS = "id,user_id,date,chest_cm,waist_cm,hips_cm,arm_cm,thigh_cm,body_fat_pct";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMeasurement = (r: any): BodyMeasurement => ({
  id: r.id,
  user_id: r.user_id,
  date: r.date,
  chest_cm: numOrNull(r.chest_cm),
  waist_cm: numOrNull(r.waist_cm),
  hips_cm: numOrNull(r.hips_cm),
  arm_cm: numOrNull(r.arm_cm),
  thigh_cm: numOrNull(r.thigh_cm),
  body_fat_pct: numOrNull(r.body_fat_pct),
});

/** Newest first. */
export async function listMeasurements(userId: string): Promise<BodyMeasurement[]> {
  const db = await getDb();
  const rows = await fetchAll((from, to) =>
    db
      .from("body_measurements")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .range(from, to),
  );
  return rows.map(toMeasurement);
}

/** One entry per user per day: saving the same date replaces the entry. */
export async function upsertMeasurement(
  userId: string,
  input: MeasurementInput,
): Promise<BodyMeasurement> {
  const db = await getDb();
  const { data, error } = await db
    .from("body_measurements")
    .upsert(
      {
        user_id: userId,
        date: input.date,
        chest_cm: input.chest_cm ?? null,
        waist_cm: input.waist_cm ?? null,
        hips_cm: input.hips_cm ?? null,
        arm_cm: input.arm_cm ?? null,
        thigh_cm: input.thigh_cm ?? null,
        body_fat_pct: input.body_fat_pct ?? null,
      },
      { onConflict: "user_id,date" },
    )
    .select(COLUMNS)
    .single();
  check(error);
  return toMeasurement(data);
}

export async function deleteMeasurement(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const db = await getDb();
  const { data, error } = await db
    .from("body_measurements")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  check(error);
  return (data?.length ?? 0) > 0;
}
