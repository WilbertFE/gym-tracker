import { beforeEach, describe, expect, it, vi } from "vitest";
import { builtInId } from "@/lib/exercise-library";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { DELETE as deleteExercise } from "@/app/api/exercises/[id]/route";
import { GET as getExercises, POST as postExercise } from "@/app/api/exercises/route";
import { POST as finish } from "@/app/api/workouts/[id]/finish/route";
import { DELETE as deleteSet, PUT as putSet } from "@/app/api/workouts/[id]/sets/[setId]/route";
import { POST as postSet } from "@/app/api/workouts/[id]/sets/route";
import { DELETE as deleteWorkout, GET as getWorkout } from "@/app/api/workouts/[id]/route";
import { GET as listWorkouts, POST as startWorkout } from "@/app/api/workouts/route";
import {
  getActiveSession,
  lastSetsByExercise,
  listSessions,
} from "@/lib/repositories/workouts";

const bench = builtInId("Barbell Bench Press");
const squat = builtInId("Barbell Back Squat");

const json = (body: unknown) =>
  new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify(body) });
const empty = () => new Request("http://localhost/api/x", { method: "POST" });
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as never;

async function start() {
  const res = await startWorkout(empty());
  return (await res.json()).data.id as string;
}

async function log(id: string, exercise_id: string, reps = 8, weight_kg = 60) {
  return postSet(json({ exercise_id, reps, weight_kg }), ctx({ id }));
}

beforeEach(async () => {
  resetStores();
  resetRateLimits();
  // The seeded demo history includes only finished workouts, so none is active.
});

describe("starting a workout", () => {
  it("creates one and returns the same one when started again", async () => {
    const first = await startWorkout(empty());
    expect(first.status).toBe(201);
    const a = await first.json();
    expect(a.already_active).toBe(false);

    const second = await startWorkout(empty());
    expect(second.status).toBe(200);
    const b = await second.json();
    expect(b.already_active).toBe(true);
    expect(b.data.id).toBe(a.data.id);
  });

  it("rejects malformed JSON", async () => {
    const bad = new Request("http://localhost/api/x", { method: "POST", body: "{nope" });
    expect((await startWorkout(bad)).status).toBe(400);
  });

  it("lists newest first, including seeded history", async () => {
    await start();
    const { data } = await (await listWorkouts()).json();
    expect(data.length).toBeGreaterThanOrEqual(4);
    const starts = data.map((s: { started_at: string }) => s.started_at);
    expect(starts).toEqual([...starts].sort().reverse());
  });
});

describe("logging sets", () => {
  it("numbers sets per exercise", async () => {
    const id = await start();
    const a1 = await (await log(id, bench)).json();
    const a2 = await (await log(id, bench)).json();
    const b1 = await (await log(id, squat)).json();
    expect([a1.data.set_number, a2.data.set_number, b1.data.set_number]).toEqual([1, 2, 1]);
  });

  it("validates reps, weight and exercise", async () => {
    const id = await start();
    expect((await postSet(json({ exercise_id: bench, reps: -1, weight_kg: 10 }), ctx({ id }))).status).toBe(400);
    expect((await postSet(json({ exercise_id: bench, reps: 5, weight_kg: 5000 }), ctx({ id }))).status).toBe(400);
    expect((await postSet(json({ exercise_id: bench, reps: "5", weight_kg: 10 }), ctx({ id }))).status).toBe(400);
    expect((await log(id, "nope")).status).toBe(400);
  });

  it("returns 404 for an unknown workout", async () => {
    expect((await log("missing", bench)).status).toBe(404);
  });

  it("edits a set and keeps its exercise", async () => {
    const id = await start();
    const { data } = await (await log(id, bench, 8, 60)).json();
    const res = await putSet(json({ reps: 10, weight_kg: 62.5 }), ctx({ id, setId: data.id }));
    expect((await res.json()).data).toMatchObject({ reps: 10, weight_kg: 62.5, exercise_id: bench });
  });

  it("renumbers remaining sets after a delete", async () => {
    const id = await start();
    const s1 = (await (await log(id, bench)).json()).data;
    await log(id, bench);
    await log(id, bench);

    expect((await deleteSet(new Request("http://x"), ctx({ id, setId: s1.id }))).status).toBe(200);
    const { data } = await (await getWorkout(new Request("http://x"), ctx({ id }))).json();
    expect(data.sets.map((s: { set_number: number }) => s.set_number)).toEqual([1, 2]);
    expect((await deleteSet(new Request("http://x"), ctx({ id, setId: s1.id }))).status).toBe(404);
  });
});

describe("finishing a workout", () => {
  it("stores the end time and duration, and is idempotent", async () => {
    const id = await start();
    const first = (await (await finish(empty(), ctx({ id }))).json()).data;
    expect(first.ended_at).toBeTruthy();
    expect(first.duration_minutes).toBeGreaterThanOrEqual(1);

    const second = (await (await finish(empty(), ctx({ id }))).json()).data;
    expect(second.ended_at).toBe(first.ended_at);
    expect(await getActiveSession("00000000-0000-4000-8000-000000000001")).toBeNull();
  });

  it("allows starting a new workout after finishing", async () => {
    const id = await start();
    await finish(empty(), ctx({ id }));
    const next = await startWorkout(empty());
    expect(next.status).toBe(201);
  });

  it("returns 404 for an unknown workout", async () => {
    expect((await finish(empty(), ctx({ id: "missing" }))).status).toBe(404);
  });
});

describe("deleting a workout", () => {
  it("removes the session and its sets", async () => {
    const id = await start();
    await log(id, bench);
    expect((await deleteWorkout(new Request("http://x"), ctx({ id }))).status).toBe(200);
    expect((await getWorkout(new Request("http://x"), ctx({ id }))).status).toBe(404);
    expect((await deleteWorkout(new Request("http://x"), ctx({ id }))).status).toBe(404);
  });
});

describe("prefill (last sets)", () => {
  it("prefers the current session over history", async () => {
    const id = await start();
    const historic = (await lastSetsByExercise("00000000-0000-4000-8000-000000000001", id))[bench];
    expect(historic).toBeDefined();

    await log(id, bench, 3, 99);
    const now = (await lastSetsByExercise("00000000-0000-4000-8000-000000000001", id))[bench];
    expect(now).toEqual({ reps: 3, weight_kg: 99 });
  });
});

describe("user isolation", () => {
  it("does not expose another user's workouts", async () => {
    await start();
    expect(await listSessions("someone-else")).toEqual([]);
  });
});

describe("/api/exercises", () => {
  it("lists built-ins and creates custom exercises", async () => {
    const before = (await (await getExercises()).json()).data.length;
    const res = await postExercise(
      json({ name: "Cable Curl", primary_muscle: "biceps", secondary_muscles: ["forearms", "biceps"] }),
    );
    expect(res.status).toBe(201);
    const created = (await res.json()).data;
    // The primary muscle is dropped from the secondary list.
    expect(created.secondary_muscles).toEqual(["forearms"]);
    expect((await (await getExercises()).json()).data).toHaveLength(before + 1);
  });

  it("rejects invalid muscle groups and empty names", async () => {
    expect((await postExercise(json({ name: "X", primary_muscle: "wings" }))).status).toBe(400);
    expect((await postExercise(json({ name: " ", primary_muscle: "chest" }))).status).toBe(400);
  });

  it("protects built-ins and exercises that are in use", async () => {
    expect((await deleteExercise(new Request("http://x"), ctx({ id: bench }))).status).toBe(403);

    const custom = (await (await postExercise(json({ name: "Zercher", primary_muscle: "quads" }))).json()).data;
    const id = await start();
    await log(id, custom.id);
    expect((await deleteExercise(new Request("http://x"), ctx({ id: custom.id }))).status).toBe(409);

    const unused = (await (await postExercise(json({ name: "Unused", primary_muscle: "abs" }))).json()).data;
    expect((await deleteExercise(new Request("http://x"), ctx({ id: unused.id }))).status).toBe(200);
    expect((await deleteExercise(new Request("http://x"), ctx({ id: unused.id }))).status).toBe(404);
  });
});

describe("set logging rate limit", () => {
  it("allows a busy workout but blocks spam", async () => {
    const id = await start();
    let last = 201;
    for (let i = 0; i < 91; i++) last = (await log(id, bench)).status;
    expect(last).toBe(429);
  });
});
