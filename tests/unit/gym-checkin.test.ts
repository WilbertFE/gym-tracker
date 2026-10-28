import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  distanceMeters,
  formatDistance,
  GYM_RADIUS_METERS,
  MAX_ACCURACY_METERS,
  verifyAtGym,
} from "@/lib/gym-location";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { GET as getCheckins, POST as postCheckin } from "@/app/api/checkins/route";
import { PUT as putMembership } from "@/app/api/membership/[id]/route";
import { GET as getMemberships } from "@/app/api/membership/route";

// The demo gym is pinned here.
const GYM = { latitude: -6.2088, longitude: 106.8456 };
const today = format(new Date(), "yyyy-MM-dd");

/** A point roughly `meters` north of the gym. One degree of latitude is about 111,195 m. */
const north = (meters: number) => ({ latitude: GYM.latitude + meters / 111_195, longitude: GYM.longitude });

const json = (body: unknown) => new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify(body) });
const checkIn = (body: Record<string, unknown>) => postCheckin(json({ date: today, ...body }));

beforeEach(() => {
  resetStores();
  resetRateLimits();
});

describe("distanceMeters", () => {
  it("is zero for the same point", () => {
    expect(distanceMeters(GYM, GYM)).toBe(0);
  });

  it("measures a known distance", () => {
    expect(distanceMeters(GYM, north(500))).toBeCloseTo(500, 0);
    // Jakarta to Bandung is about 116 km as the crow flies.
    expect(distanceMeters({ latitude: -6.2088, longitude: 106.8456 }, { latitude: -6.9175, longitude: 107.6191 })).toBeGreaterThan(110_000);
  });

  it("formats meters and kilometers", () => {
    expect(formatDistance(850.4)).toBe("850 m");
    expect(formatDistance(1400)).toBe("1.4 km");
  });
});

describe("verifyAtGym", () => {
  it("accepts a position at the gym", () => {
    expect(verifyAtGym(GYM, { ...GYM, accuracy: 10 })).toMatchObject({ ok: true });
  });

  it("accepts a position just inside the radius and refuses one just outside", () => {
    expect(verifyAtGym(GYM, { ...north(GYM_RADIUS_METERS - 5), accuracy: 0 }).ok).toBe(true);
    expect(verifyAtGym(GYM, { ...north(GYM_RADIUS_METERS + 50), accuracy: 0 })).toMatchObject({ ok: false, reason: "too_far" });
  });

  it("forgives some of a poor accuracy, but not all of it", () => {
    // 280 m away with a 200 m error margin: 100 m is forgiven, 180 m effective, inside 200.
    expect(verifyAtGym(GYM, { ...north(280), accuracy: 200 }).ok).toBe(true);
    // 400 m away is outside even with the full allowance.
    expect(verifyAtGym(GYM, { ...north(400), accuracy: 300 })).toMatchObject({ ok: false, reason: "too_far" });
  });

  it("refuses a position too vague to prove anything", () => {
    expect(verifyAtGym(GYM, { ...GYM, accuracy: MAX_ACCURACY_METERS + 1 })).toMatchObject({ ok: false, reason: "inaccurate" });
  });

  it("refuses with no gym pinned or no position", () => {
    expect(verifyAtGym(null, { ...GYM })).toMatchObject({ ok: false, reason: "no_gym_location" });
    expect(verifyAtGym(GYM, null)).toMatchObject({ ok: false, reason: "no_position" });
    expect(verifyAtGym(GYM, { latitude: 999, longitude: 0 })).toMatchObject({ ok: false, reason: "no_position" });
  });
});

describe("POST /api/checkins and the gym location", () => {
  it("refuses a gym check-in with no position and saves nothing", async () => {
    const res = await checkIn({ went_to_gym: true });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "location_required", reason: "no_position" });
    const stored = (await (await getCheckins()).json()).data.filter((c: { date: string }) => c.date === today);
    expect(stored).toHaveLength(0);
  });

  it("refuses a position far from the gym and says how far", async () => {
    const res = await checkIn({ went_to_gym: true, ...north(5000), accuracy: 10 });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ code: "location_required", reason: "too_far" });
    expect(body.distance_meters).toBeGreaterThan(4900);
    expect(body.error).toContain("Demo Fitness Club");
  });

  it("accepts a position at the gym", async () => {
    const res = await checkIn({ went_to_gym: true, ...north(30), accuracy: 15 });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toMatchObject({ date: today, went_to_gym: true });
  });

  it("does not store the position", async () => {
    const { data } = await (await checkIn({ went_to_gym: true, ...GYM, accuracy: 5 })).json();
    expect(data).not.toHaveProperty("latitude");
    expect(data).not.toHaveProperty("longitude");
    expect(data).not.toHaveProperty("accuracy");
  });

  it("needs no position for a rest day", async () => {
    expect((await checkIn({ went_to_gym: false })).status).toBe(200);
  });

  it("lets a verified gym check-in be edited from anywhere", async () => {
    await checkIn({ went_to_gym: true, ...GYM, accuracy: 5 });
    const res = await checkIn({ went_to_gym: true, mood: 4 });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toMatchObject({ mood: 4, went_to_gym: true });
  });

  it("asks for the position again when a rest day is changed to a gym day", async () => {
    await checkIn({ went_to_gym: false });
    expect((await checkIn({ went_to_gym: true })).status).toBe(403);
    expect((await checkIn({ went_to_gym: true, ...GYM, accuracy: 5 })).status).toBe(200);
  });

  it("refuses when the membership has no pinned location", async () => {
    const [membership] = (await (await getMemberships()).json()).data;
    const { id, user_id: _user, ...rest } = membership;
    void _user;
    await putMembership(
      new Request("http://localhost/api/x", {
        method: "PUT",
        body: JSON.stringify({ ...rest, latitude: null, longitude: null }),
      }),
      { params: Promise.resolve({ id }) } as never,
    );
    const res = await checkIn({ went_to_gym: true, ...GYM, accuracy: 5 });
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe("no_gym_location");
  });

  it("rejects an impossible position", async () => {
    expect((await checkIn({ went_to_gym: true, latitude: 200, longitude: 0 })).status).toBe(400);
  });
});
