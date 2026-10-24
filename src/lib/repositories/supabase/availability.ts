import "server-only";
import { toMinutes, WEEKDAY_ORDER } from "@/lib/scheduling";
import type { AvailabilityBlock } from "@/lib/types";
import type { AvailabilityInput } from "@/lib/validation/availability";
import { check, fetchAll, getDb, isUuid } from "./db";

const COLUMNS = "id,user_id,weekday,start_time,end_time,label";

const dayRank = (weekday: number) => WEEKDAY_ORDER.indexOf(weekday as (typeof WEEKDAY_ORDER)[number]);

/** Postgres `time` comes back as HH:MM:SS. The app works in HH:MM. */
const trimTime = (t: string) => String(t).slice(0, 5);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toBlock = (r: any): AvailabilityBlock => ({
  id: r.id,
  user_id: r.user_id,
  weekday: r.weekday,
  start_time: trimTime(r.start_time),
  end_time: trimTime(r.end_time),
  label: r.label,
});

const toRow = (input: AvailabilityInput) => ({
  weekday: input.weekday,
  start_time: input.start_time,
  end_time: input.end_time,
  label: input.label || null,
});

/** Monday first, then by start time. */
export async function listAvailability(userId: string): Promise<AvailabilityBlock[]> {
  const db = await getDb();
  const rows = await fetchAll((from, to) =>
    db.from("availability_blocks").select(COLUMNS).eq("user_id", userId).order("id").range(from, to),
  );
  return rows
    .map(toBlock)
    .sort(
      (a, b) =>
        dayRank(a.weekday) - dayRank(b.weekday) || toMinutes(a.start_time) - toMinutes(b.start_time),
    );
}

export async function createAvailability(
  userId: string,
  input: AvailabilityInput,
): Promise<AvailabilityBlock> {
  const db = await getDb();
  const { data, error } = await db
    .from("availability_blocks")
    .insert({ user_id: userId, ...toRow(input) })
    .select(COLUMNS)
    .single();
  check(error);
  return toBlock(data);
}

export async function updateAvailability(
  userId: string,
  id: string,
  input: AvailabilityInput,
): Promise<AvailabilityBlock | null> {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const { data, error } = await db
    .from("availability_blocks")
    .update(toRow(input))
    .eq("id", id)
    .eq("user_id", userId)
    .select(COLUMNS)
    .maybeSingle();
  check(error);
  return data ? toBlock(data) : null;
}

export async function deleteAvailability(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const db = await getDb();
  const { data, error } = await db
    .from("availability_blocks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  check(error);
  return (data?.length ?? 0) > 0;
}
