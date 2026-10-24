import { format, subDays } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { POST as postCheckin } from "@/app/api/checkins/route";
import { POST as finish } from "@/app/api/workouts/[id]/finish/route";
import { POST as startWorkout } from "@/app/api/workouts/route";
import { listSessions } from "@/lib/repositories/workouts";
import { decideGate, GATE_MESSAGES, getWorkoutGate } from "@/lib/workout-gate";

const DEMO = "00000000-0000-4000-8000-000000000001";
const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const today = fmt(new Date());
const yesterday = fmt(subDays(new Date(), 1));

const json = (body: unknown) =>
  new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify(body) });
const empty = () => new Request("http://localhost/api/x", { method: "POST" });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const checkIn = (date: string, went_to_gym: boolean) => postCheckin(json({ date, went_to_gym }));

beforeEach(() => {
  resetStores(); // The demo seed has no check-in for today.
  resetRateLimits();
});

describe("decideGate", () => {
  it("allows a new workout only after a gym check-in", () => {
    expect(decideGate({ hasActive: false, checkin: { went_to_gym: true } })).toEqual({
      allowed: true,
      reason: null,
      hasActive: false,
    });
  });

  it("blocks with no check-in", () => {
    expect(decideGate({ hasActive: false, checkin: null })).toEqual({
      allowed: false,
      reason: "no_checkin",
      hasActive: false,
    });
  });

  it("blocks when today is marked as a rest day", () => {
    expect(decideGate({ hasActive: false, checkin: { went_to_gym: false } })).toMatchObject({
      allowed: false,
      reason: "rest_day",
    });
  });

  it("always lets you continue a workout that is already in progress", () => {
    for (const checkin of [null, { went_to_gym: false }, { went_to_gym: true }]) {
      expect(decideGate({ hasActive: true, checkin })).toEqual({ allowed: true, reason: null, hasActive: true });
    }
  });

  it("has a distinct, plain message for each reason", () => {
    expect(GATE_MESSAGES.no_checkin).not.toBe(GATE_MESSAGES.rest_day);
    expect(GATE_MESSAGES.rest_day).toContain("rest day");
    for (const message of Object.values(GATE_MESSAGES)) expect(message).not.toContain("—");
  });
});

describe("POST /api/workouts enforces the gym check-in", () => {
  it("returns 403 with no check-in today and creates nothing", async () => {
    const before = (await listSessions(DEMO)).length;
    const res = await startWorkout(empty());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: GATE_MESSAGES.no_checkin,
      code: "checkin_required",
      reason: "no_checkin",
    });
    expect(await listSessions(DEMO)).toHaveLength(before);
  });

  it("returns 403 when today is a rest day", async () => {
    await checkIn(today, false);
    const res = await startWorkout(empty());
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe("rest_day");
  });

  it("allows starting after checking in as went to the gym", async () => {
    await checkIn(today, true);
    const res = await startWorkout(empty());
    expect(res.status).toBe(201);
    expect((await res.json()).already_active).toBe(false);
  });

  it("does not count a check-in from another day", async () => {
    await checkIn(yesterday, true);
    expect((await startWorkout(empty())).status).toBe(403);
  });

  it("follows a changed check-in: rest day blocks, switching back to gym allows", async () => {
    await checkIn(today, false);
    expect((await startWorkout(empty())).status).toBe(403);
    await checkIn(today, true); // Saving the same day again replaces the entry.
    expect((await startWorkout(empty())).status).toBe(201);
  });

  it("lets you continue a workout in progress even if the check-in changes afterwards", async () => {
    await checkIn(today, true);
    const started = await (await startWorkout(empty())).json();

    await checkIn(today, false);
    const again = await startWorkout(empty());
    expect(again.status).toBe(200);
    const body = await again.json();
    expect(body.already_active).toBe(true);
    expect(body.data.id).toBe(started.data.id);
    expect((await getWorkoutGate(DEMO)).allowed).toBe(true);
  });

  it("blocks a second workout after the first is finished if today became a rest day", async () => {
    await checkIn(today, true);
    const { data } = await (await startWorkout(empty())).json();
    await finish(empty(), ctx(data.id));

    await checkIn(today, false);
    expect((await startWorkout(empty())).status).toBe(403);
  });

  it("still validates the request body before the rule", async () => {
    const bad = new Request("http://localhost/api/x", { method: "POST", body: "{nope" });
    expect((await startWorkout(bad)).status).toBe(400);
  });
});

describe("getWorkoutGate", () => {
  it("reflects today's check-in and any active workout", async () => {
    expect(await getWorkoutGate(DEMO)).toMatchObject({ allowed: false, reason: "no_checkin", hasActive: false });
    await checkIn(today, true);
    expect(await getWorkoutGate(DEMO)).toMatchObject({ allowed: true, reason: null, hasActive: false });
    await startWorkout(empty());
    expect(await getWorkoutGate(DEMO)).toMatchObject({ allowed: true, hasActive: true });
  });

  it("is per user", async () => {
    await checkIn(today, true);
    expect(await getWorkoutGate("someone-else")).toMatchObject({ allowed: false, reason: "no_checkin" });
  });
});
