import "server-only";
import type { WeightLog } from "@/lib/types";
import type { WeightInput } from "@/lib/validation/weight";
import { check, fetchAll, getDb, isUuid, num } from "./db";
import { listEntryFilePaths, removeStoredFiles } from "./logPhotos";

const COLUMNS = "id,user_id,date,weight_kg,notes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toWeight = (r: any): WeightLog => ({
  id: r.id,
  user_id: r.user_id,
  date: r.date,
  weight_kg: num(r.weight_kg),
  notes: r.notes,
});

export async function listWeights(userId: string): Promise<WeightLog[]> {
  const db = await getDb();
  const rows = await fetchAll((from, to) =>
    db
      .from("weight_logs")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return rows.map(toWeight);
}

export async function createWeight(userId: string, input: WeightInput): Promise<WeightLog> {
  const db = await getDb();
  const { data, error } = await db
    .from("weight_logs")
    .insert({ user_id: userId, date: input.date, weight_kg: input.weight_kg, notes: input.notes ?? null })
    .select(COLUMNS)
    .single();
  check(error);
  return toWeight(data);
}

export async function updateWeight(
  userId: string,
  id: string,
  input: WeightInput,
): Promise<WeightLog | null> {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const { data, error } = await db
    .from("weight_logs")
    .update({ date: input.date, weight_kg: input.weight_kg, notes: input.notes ?? null })
    .eq("id", id)
    .eq("user_id", userId)
    .select(COLUMNS)
    .maybeSingle();
  check(error);
  return data ? toWeight(data) : null;
}

export async function deleteWeight(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const db = await getDb();
  // Photo rows go with the weigh-in (on delete cascade). Their files do not, so collect them first.
  const files = await listEntryFilePaths(userId, "weight", id);
  const { data, error } = await db.from("weight_logs").delete().eq("id", id).eq("user_id", userId).select("id");
  check(error);
  if ((data?.length ?? 0) === 0) return false;
  await removeStoredFiles(files);
  return true;
}
