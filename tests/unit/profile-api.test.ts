import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_USER_ID } from "@/lib/demo";
import { resetRateLimits } from "@/lib/rate-limit";
import { getProfile } from "@/lib/repositories/memory/profiles";
import { resetStores } from "@/lib/repositories/memory/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { GET as getBoard } from "@/app/api/leaderboard/route";
import { PUT as joinBoard } from "@/app/api/leaderboard/profile/route";
import { GET as checkUsername } from "@/app/api/profile/check/route";
import { DELETE as removeProfile, GET as getOwn, PUT as putOwn } from "@/app/api/profile/route";
import { loadProfileView } from "@/lib/profile-view";

const body = (over: Record<string, unknown> = {}) => ({
  username: "iron_wil",
  display_name: "Iron Wil",
  bio: "Leg day",
  visibility: "members",
  sections: { stats: false },
  ...over,
});
const put = (data: unknown) => putOwn(new Request("http://localhost/api/profile", { method: "PUT", body: JSON.stringify(data) }));
const own = async () => (await (await getOwn()).json()).data;
const check = async (username: string) =>
  (await (await checkUsername(new Request(`http://localhost/api/profile/check?username=${encodeURIComponent(username)}`))).json()).data;

beforeEach(() => {
  resetStores();
  resetRateLimits();
});

describe("your own profile", () => {
  it("starts as none", async () => {
    expect(await own()).toMatchObject({ available: true, profile: null, suggestedName: null });
  });

  it("is created with a lowercase username, and read back without the snapshot", async () => {
    const res = await put(body({ username: "Iron_Wil" }));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toMatchObject({ username: "iron_wil", display_name: "Iron Wil", bio: "Leg day", visibility: "members" });
    expect(data.sections).toMatchObject({ stats: false, level: true });
    expect(data).not.toHaveProperty("snapshot");
    expect((await own()).profile.username).toBe("iron_wil");
  });

  it("starts the public snapshot, worked out by the server", async () => {
    await put(body());
    const stored = (await getProfile(DEMO_USER_ID)).profile!;
    expect(stored.snapshot).not.toBeNull();
    expect(stored.snapshot!.level).toBeGreaterThan(0);
    // Nothing private is in there.
    expect(JSON.stringify(stored.snapshot)).not.toMatch(/"(weight_kg|latitude|longitude|email|gym_name)":/);
  });

  it("starts private when asked to", async () => {
    await put(body({ visibility: "private" }));
    expect((await own()).profile.visibility).toBe("private");
  });

  it("refuses a bad username, a bad name, a long bio and a bad visibility", async () => {
    for (const bad of [
      body({ username: "ab" }),
      body({ username: "has space" }),
      body({ username: "admin" }),
      body({ username: "_x_y" }),
      body({ display_name: "x" }),
      body({ display_name: "<b>bold</b>" }),
      body({ bio: "x".repeat(161) }),
      body({ visibility: "public" }),
      body({ visibility: undefined }),
      {},
      "nope",
    ]) {
      // More attempts than the rate limit allows in a minute, so it is reset between them.
      resetRateLimits();
      expect((await put(bad)).status, JSON.stringify(bad)).toBe(400);
    }
    expect((await own()).profile).toBeNull();
  });

  it("refuses a username or display name somebody else has, whatever the capitals", async () => {
    const username = await put(body({ username: "AYU_PRATAMA" }));
    expect(username.status).toBe(409);
    expect((await username.json()).code).toBe("username_taken");
    const name = await put(body({ display_name: "ayu pratama" }));
    expect(name.status).toBe(409);
    expect((await name.json()).code).toBe("name_taken");
  });

  it("lets you keep your own username and name when you save again", async () => {
    await put(body());
    expect((await put(body({ bio: "New bio" }))).status).toBe(200);
    expect((await own()).profile.bio).toBe("New bio");
  });

  it("keeps a bio as one line of plain text", async () => {
    await put(body({ bio: "line one\nline two" }));
    expect((await own()).profile.bio).toBe("line one line two");
  });

  it("limits how often it can be saved", async () => {
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await put({})).status;
    expect(last).toBe(429);
  });

  it("can be deleted", async () => {
    await put(body());
    expect((await removeProfile()).status).toBe(200);
    expect((await own()).profile).toBeNull();
  });
});

describe("the username check", () => {
  it("says whether a name is free, with the reason when it is not", async () => {
    expect(await check("fresh_name")).toMatchObject({ available: true, username: "fresh_name" });
    expect(await check("Ayu_Pratama")).toMatchObject({ available: false, message: "That username is taken." });
    expect(await check("admin")).toMatchObject({ available: false });
    expect(await check("a")).toMatchObject({ available: false });
  });

  it("does not call your own username taken", async () => {
    await put(body());
    expect(await check("iron_wil")).toMatchObject({ available: true });
  });

  it("is rate limited, so it cannot list the usernames that exist", async () => {
    let last = 200;
    for (let i = 0; i < 21; i++) last = (await checkUsername(new Request("http://localhost/api/profile/check?username=abc"))).status;
    expect(last).toBe(429);
  });
});

describe("opening someone's profile", () => {
  it("shows a visible profile with only the sections its owner shares", async () => {
    const result = await loadProfileView(DEMO_USER_ID, "jordan_reyes");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const view = result.view;
    expect(view).toMatchObject({ displayName: "Jordan Reyes", isOwner: false });
    expect(view.level).not.toBeNull();
    expect(view.collection).not.toBeNull();
    // Jordan switched stats, muscles and activity off: none of it is in what the page receives.
    expect(view.stats).toBeNull();
    expect(view.muscles).toBeNull();
    expect(view.activity).toBeNull();
    expect(JSON.stringify(view)).not.toContain("Strength");
  });

  it("treats a private profile and a missing one the same", async () => {
    expect(await loadProfileView(DEMO_USER_ID, "budi_santoso")).toEqual({ status: "not_found" });
    expect(await loadProfileView(DEMO_USER_ID, "nobody_here")).toEqual({ status: "not_found" });
    expect(await loadProfileView(DEMO_USER_ID, "not a username!")).toEqual({ status: "not_found" });
  });

  it("is case blind in the address", async () => {
    expect((await loadProfileView(DEMO_USER_ID, "AYU_Pratama")).status).toBe("ok");
  });

  it("shows you your own private profile, with every section, live", async () => {
    await put(body({ visibility: "private", sections: { stats: false, activity: false } }));
    const result = await loadProfileView(DEMO_USER_ID, "iron_wil");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.view.isOwner).toBe(true);
    expect(result.view.stats).not.toBeNull();
    expect(result.view.activity).not.toBeNull();
    expect(result.view.shared).toMatchObject({ stats: false, activity: false, level: true });
  });

  it("makes a profile reachable only while it is visible", async () => {
    // Someone else can open it while it is visible, and not once it is private again.
    await put(body({ visibility: "members" }));
    const { toPublicProfile } = await import("@/lib/profile");
    const stored = (await getProfile(DEMO_USER_ID)).profile!;
    expect(toPublicProfile(stored, false)).not.toBeNull();
    await put(body({ visibility: "private" }));
    expect(toPublicProfile((await getProfile(DEMO_USER_ID)).profile!, false)).toBeNull();
  });
});

describe("one name for the profile and the leaderboard", () => {
  const join = (name: string) => joinBoard(new Request("http://localhost/api/leaderboard/profile", { method: "PUT", body: JSON.stringify({ display_name: name }) }));
  const me = async () => (await (await getBoard(new Request("http://localhost/api/leaderboard"))).json()).data.me;

  it("uses the profile's display name when joining, whatever nickname is sent", async () => {
    await put(body());
    const res = await join("Something Else");
    expect(res.status).toBe(200);
    expect((await res.json()).data.display_name).toBe("Iron Wil");
    expect((await me()).display_name).toBe("Iron Wil");
  });

  it("renames the leaderboard entry when the profile is renamed", async () => {
    await put(body());
    await join("ignored");
    expect((await put(body({ display_name: "Iron Willow" }))).status).toBe(200);
    expect((await me()).display_name).toBe("Iron Willow");
  });

  it("does not let a leaderboard nickname take a name a profile already has", async () => {
    const res = await join("Mia Hoffmann");
    expect(res.status).toBe(409);
  });

  it("links a leaderboard row to a profile only when it is open to other users", async () => {
    const rows = (await (await getBoard(new Request("http://localhost/api/leaderboard?scope=global&period=all"))).json()).data.rows as { display_name: string; username: string | null }[];
    expect(rows.find((r) => r.display_name === "Ayu Pratama")?.username).toBe("ayu_pratama");
    // Budi's profile is private and Citra has none, so neither links anywhere.
    expect(rows.find((r) => r.display_name === "Budi Santoso")?.username).toBeNull();
    expect(rows.find((r) => r.display_name === "Citra Lestari")?.username).toBeNull();
  });
});
