import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { verdictMessage, verifyAtGym } from "@/lib/gym-location";
import { getCheckinByDate, listCheckins, upsertCheckin } from "@/lib/repositories/checkins";
import { listMemberships } from "@/lib/repositories/memberships";
import { checkinSchema } from "@/lib/validation/checkin";

export async function GET() {
  const g = await guard("checkins", { write: false });
  if (g.error) return g.error;
  return NextResponse.json({ data: await listCheckins(g.userId) });
}

/**
 * Creates or replaces the check-in for the given date. A gym check-in needs a position within
 * reach of the gym pinned on the Membership page. A home workout or a rest day needs no position, and a
 * day that is already a verified gym check-in can be edited (mood, sleep) from anywhere.
 */
export async function POST(request: Request) {
  const g = await guard("checkins", { write: true });
  if (g.error) return g.error;

  const parsed = checkinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();
  const { latitude, longitude, accuracy, ...input } = parsed.data;

  if (input.kind === "gym") {
    const existing = await getCheckinByDate(g.userId, input.date);
    if (existing?.kind !== "gym") {
      const [membership] = await listMemberships(g.userId);
      const gym =
        membership && membership.latitude !== null && membership.longitude !== null
          ? { latitude: membership.latitude, longitude: membership.longitude }
          : null;
      const position = latitude != null && longitude != null ? { latitude, longitude, accuracy } : null;

      const verdict = verifyAtGym(gym, position);
      if (!verdict.ok) {
        return NextResponse.json(
          {
            error: verdictMessage(verdict, membership?.gym_name),
            code: "location_required",
            reason: verdict.reason,
            ...(verdict.distance !== undefined && { distance_meters: Math.round(verdict.distance) }),
          },
          { status: 403 },
        );
      }
    }
  }

  return NextResponse.json({ data: await upsertCheckin(g.userId, input) });
}
