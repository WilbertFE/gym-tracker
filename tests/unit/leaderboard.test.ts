import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  boardXp,
  currentWeekStart,
  entryXp,
  LEADERBOARD,
  positionOf,
  rankRows,
  validateDisplayName,
  type LeaderboardEntry,
} from "@/lib/leaderboard";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";
import { addDaysISO } from "@/lib/week";
import { computeXp } from "@/lib/xp";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { GET as getBoard } from "@/app/api/leaderboard/route";
import { DELETE as leave, PUT as join } from "@/app/api/leaderboard/profile/route";
import { POST as sync } from "@/app/api/leaderboard/sync/route";
import { PUT as putSettings } from "@/app/api/settings/route";
import { POST as postCheckin } from "@/app/api/checkins/route";

const today = format(new Date(), "yyyy-MM-dd");
const week = currentWeekStart(today);

const entry = (over: Partial<LeaderboardEntry> & { display_name: string }): LeaderboardEntry => ({
  user_id: over.display_name,
  country: "ID",
  total_xp: 0,
  week_xp: 0,
  week_start: week,
  level: 1,
  title: null,
  plate: null,
  updated_at: "2026-10-01T00:00:00.000Z",
  ...over,
});

describe("validateDisplayName", () => {
  it("accepts a plain nickname and tidies spaces", () => {
    expect(validateDisplayName("  Iron   Mike  ")).toEqual({ ok: true, name: "Iron Mike" });
    expect(validateDisplayName("lift_king-99.x")).toMatchObject({ ok: true });
    expect(validateDisplayName("Budi Santoso Putra")).toMatchObject({ ok: true });
    expect(validateDisplayName("Ünal Çelik")).toMatchObject({ ok: true });
  });

  it("enforces the length", () => {
    expect(validateDisplayName("ab")).toMatchObject({ ok: false });
    expect(validateDisplayName("abc")).toMatchObject({ ok: true });
    expect(validateDisplayName("a".repeat(LEADERBOARD.maxNameLength))).toMatchObject({ ok: true });
    expect(validateDisplayName("a".repeat(LEADERBOARD.maxNameLength + 1))).toMatchObject({ ok: false });
  });

  it.each(["me@example.com", "<script>x</script>", "name;drop", "a/b/c", "emoji \u{1F4AA}", "...", "- - -"])(
    "refuses %j",
    (name) => {
      expect(validateDisplayName(name)).toMatchObject({ ok: false });
    },
  );

  it("keeps a few names for the team, in any case", () => {
    for (const name of ["admin", "Admin", "MODERATOR", "Muscles Leveling"]) {
      expect(validateDisplayName(name)).toMatchObject({ ok: false });
    }
  });

  it("is not fooled by non-strings, and its messages have no em dash", () => {
    for (const v of [null, undefined, 42, {}]) expect(validateDisplayName(v)).toMatchObject({ ok: false });
    for (const v of ["", "ab", "a@b.c", "admin"]) {
      const r = validateDisplayName(v);
      if (!r.ok) expect(r.message).not.toContain("—");
    }
  });
});

describe("boardXp", () => {
  const lines = (streak = 0) => [{ source: "streak", label: "", count: 0, xp: streak, bonus: 0 }] as never;

  it("adds every day for all time and this week's days for the week", () => {
    const monday = week;
    const byDate = {
      [addDaysISO(monday, -3)]: 100,
      [monday]: 50,
      [addDaysISO(monday, 6)]: 30,
      [addDaysISO(monday, 7)]: 999,
    };
    const { total, week: w } = boardXp({ byDate, lines: lines() }, today);
    expect(w).toBe(80);
    expect(total).toBe(100 + 50 + 30 + 400);
  });

  it("counts the streak bonus in all time only", () => {
    const { total, week: w } = boardXp({ byDate: { [today]: 20 }, lines: lines(70) }, today);
    expect(total).toBe(90);
    expect(w).toBe(20);
  });

  it("counts a day at most the day limit", () => {
    const { total, week: w } = boardXp({ byDate: { [today]: 5000 }, lines: lines() }, today);
    expect(total).toBe(LEADERBOARD.dayCapXp);
    expect(w).toBe(LEADERBOARD.dayCapXp);
  });

  it("does not limit a normal, even boosted, day", () => {
    const xp = computeXp({
      checkins: [{ date: today, kind: "gym" }],
      weights: [{ date: today }],
      photos: [{ date: today }],
      sessions: [{ id: "w", date: today, ended_at: `${today}T11:00:00.000Z` }],
      sets: Array.from({ length: 30 }, () => ({ session_id: "w" })),
      boostedDays: [today],
    });
    // 20 + 10 + 10 + 40 + 60 = 140, doubled.
    expect(xp.byDate[today]).toBe(280);
    expect(boardXp(xp, today).total).toBe(xp.total);
  });

  it("is zero with no XP", () => {
    expect(boardXp({ byDate: {}, lines: lines() }, today)).toEqual({ total: 0, week: 0 });
  });
});

describe("ranking", () => {
  const rows = [
    entry({ display_name: "Cara", total_xp: 100, week_xp: 5 }),
    entry({ display_name: "Abe", total_xp: 300, week_xp: 0 }),
    entry({ display_name: "Ben", total_xp: 300, week_xp: 90, updated_at: "2026-10-02T00:00:00.000Z" }),
    entry({ display_name: "Dee", total_xp: 50, week_xp: 40, week_start: addDaysISO(week, -7) }),
  ];

  it("orders by XP, then who got there first, then the name", () => {
    expect(rankRows(rows, "all", week).map((r) => r.display_name)).toEqual(["Abe", "Ben", "Cara", "Dee"]);
  });

  it("ranks the week by this week's XP and leaves out anyone with none", () => {
    expect(rankRows(rows, "week", week).map((r) => r.display_name)).toEqual(["Ben", "Cara"]);
  });

  it("treats a weekly score from an earlier week as nothing", () => {
    expect(entryXp(rows[3], "week", week)).toBe(0);
    expect(entryXp(rows[3], "all", week)).toBe(50);
  });

  it("finds a position, or none", () => {
    const sorted = rankRows(rows, "all", week);
    expect(positionOf(sorted, "Cara")).toBe(3);
    expect(positionOf(sorted, "nobody")).toBeNull();
  });
});

describe("/api/leaderboard", () => {
  const DEMO = "00000000-0000-4000-8000-000000000001";
  const get = (qs = "") => getBoard(new Request(`http://localhost/api/leaderboard${qs}`));
  const put = (body: unknown) => join(new Request("http://localhost/api/leaderboard/profile", { method: "PUT", body: JSON.stringify(body) }));

  beforeEach(() => {
    resetStores();
    resetRateLimits();
  });

  it("shows the sample players, best first, without any user ids", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.joined).toBe(false);
    expect(data.rows.length).toBeGreaterThan(5);
    expect(data.rows[0].rank).toBe(1);
    const xps = data.rows.map((r: { xp: number }) => r.xp);
    expect(xps).toEqual([...xps].sort((a, b) => b - a));
    expect(JSON.stringify(data)).not.toMatch(/user_id|sample-|email/);
  });

  it("returns at most the top rows", async () => {
    const { data } = await (await get()).json();
    expect(data.rows.length).toBeLessThanOrEqual(LEADERBOARD.top);
  });

  it("filters to this week", async () => {
    const { data } = await (await get("?period=week")).json();
    expect(data.rows.every((r: { xp: number }) => r.xp > 0)).toBe(true);
    expect(data.rows[0].xp).toBeLessThanOrEqual(1000);
  });

  it("rejects an unknown scope or period", async () => {
    expect((await get("?scope=galaxy")).status).toBe(400);
    expect((await get("?period=century")).status).toBe(400);
  });

  it("asks for a country before showing the country board", async () => {
    const res = await get("?scope=country");
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("no_country");
  });

  it("shows only your country's players once you have one", async () => {
    await putSettings(new Request("http://localhost/api/settings", { method: "PUT", body: JSON.stringify({ country: "ID", weight_unit: "kg", currency: "IDR" }) }));
    const { data } = await (await get("?scope=country")).json();
    expect(data.rows.length).toBeGreaterThan(1);
    expect(data.rows.every((r: { country: string }) => r.country === "ID")).toBe(true);
  });

  it("joins with a nickname, with a score the server worked out", async () => {
    await postCheckin(new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify({ date: today, kind: "rest" }) }));
    const res = await put({ display_name: "  Test   Lifter " });
    expect(res.status).toBe(200);
    expect((await res.json()).data.display_name).toBe("Test Lifter");

    const { data } = await (await get()).json();
    expect(data.joined).toBe(true);
    expect(data.displayName).toBe("Test Lifter");
    expect(data.me).toMatchObject({ display_name: "Test Lifter", is_me: true });
    // The demo user has real XP from the demo data, and the score is not something the request could set.
    expect(data.me.xp).toBeGreaterThan(0);
  });

  it("ignores a score sent in the body", async () => {
    const res = await put({ display_name: "Cheater", total_xp: 9_999_999, week_xp: 9_999_999, level: 999 });
    expect(res.status).toBe(200);
    const { data } = await (await get()).json();
    expect(data.me.xp).toBeLessThan(100_000);
    expect(data.me.level).toBeLessThan(100);
  });

  it("refuses a taken nickname, whatever its case, and a bad one", async () => {
    expect((await put({ display_name: "ayu pratama" })).status).toBe(409);
    expect((await put({ display_name: "x" })).status).toBe(400);
    expect((await put({ display_name: "me@example.com" })).status).toBe(400);
    expect((await put({})).status).toBe(400);
    expect((await get()).status).toBe(200);
    expect((await (await get()).json()).data.joined).toBe(false);
  });

  it("lets you rename and keep your own name", async () => {
    await put({ display_name: "First Name" });
    expect((await put({ display_name: "First Name" })).status).toBe(200);
    expect((await put({ display_name: "Second Name" })).status).toBe(200);
    expect((await (await get()).json()).data.displayName).toBe("Second Name");
  });

  it("shows your position even when you are outside the top rows", async () => {
    await put({ display_name: "Newcomer" });
    const { data } = await (await get("?period=week")).json();
    // A weekly board hides people with no XP this week, so a newcomer may not be listed.
    if (data.me) expect(data.me.is_me).toBe(true);
    const all = await (await get()).json();
    expect(all.data.me.rank).toBeGreaterThan(0);
  });

  it("leaves, and your entry is gone", async () => {
    await put({ display_name: "Leaver" });
    const res = await leave();
    expect(res.status).toBe(200);
    const { data } = await (await get()).json();
    expect(data.joined).toBe(false);
    expect(data.me).toBeNull();
    expect(data.rows.some((r: { display_name: string }) => r.display_name === "Leaver")).toBe(false);
  });

  it("does nothing on sync when you have not joined", async () => {
    expect((await sync()).status).toBe(204);
    expect((await (await get()).json()).data.joined).toBe(false);
  });

  it("limits how often a score is synced", async () => {
    await put({ display_name: "Syncer" });
    expect((await sync()).status).toBe(204);
    const again = await sync();
    expect(again.status).toBe(429);
    expect(again.headers.get("Retry-After")).toBeTruthy();
  });

  it("knows the demo user", () => {
    expect(DEMO).toMatch(/^0{8}/);
  });
});
