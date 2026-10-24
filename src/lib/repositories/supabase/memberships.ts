import "server-only";
import type { Membership } from "@/lib/types";
import type { MembershipInput } from "@/lib/validation/membership";
import { check, fetchAll, getDb, isUuid, numOrNull } from "./db";

const COLUMNS = "id,user_id,gym_name,location,latitude,longitude,start_date,end_date,price,notes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMembership = (r: any): Membership => ({
  id: r.id,
  user_id: r.user_id,
  gym_name: r.gym_name,
  location: r.location,
  latitude: numOrNull(r.latitude),
  longitude: numOrNull(r.longitude),
  start_date: r.start_date,
  end_date: r.end_date,
  price: numOrNull(r.price),
  notes: r.notes,
});

const toRow = (input: MembershipInput) => ({
  gym_name: input.gym_name,
  location: input.location || null,
  latitude: input.latitude ?? null,
  longitude: input.longitude ?? null,
  start_date: input.start_date,
  end_date: input.end_date,
  price: input.price ?? null,
  notes: input.notes ?? null,
});

/** Newest membership first (by end date). */
export async function listMemberships(userId: string): Promise<Membership[]> {
  const db = await getDb();
  const rows = await fetchAll((from, to) =>
    db
      .from("memberships")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("end_date", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return rows.map(toMembership);
}

export async function createMembership(userId: string, input: MembershipInput): Promise<Membership> {
  const db = await getDb();
  const { data, error } = await db
    .from("memberships")
    .insert({ user_id: userId, ...toRow(input) })
    .select(COLUMNS)
    .single();
  check(error);
  return toMembership(data);
}

export async function updateMembership(
  userId: string,
  id: string,
  input: MembershipInput,
): Promise<Membership | null> {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const { data, error } = await db
    .from("memberships")
    .update(toRow(input))
    .eq("id", id)
    .eq("user_id", userId)
    .select(COLUMNS)
    .maybeSingle();
  check(error);
  return data ? toMembership(data) : null;
}

export async function deleteMembership(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const db = await getDb();
  const { data, error } = await db.from("memberships").delete().eq("id", id).eq("user_id", userId).select("id");
  check(error);
  return (data?.length ?? 0) > 0;
}
