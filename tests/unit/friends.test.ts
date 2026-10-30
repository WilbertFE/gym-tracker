import { describe, expect, it } from "vitest";
import { CHEST_ODDS, CHEST_PITY, CHEST_TIER, chestId, chestKind, isChestId } from "@/lib/chests";
import {
  buildMembers,
  countsFromWeek,
  FRIEND_BOSS_MIN_HP_PER_MEMBER,
  FRIEND_CODE_LENGTH,
  finishedWeeks,
  formatFriendCode,
  friendBossFor,
  friendBossHp,
  friendChests,
  friendMonsterFor,
  generateFriendCode,
  MAX_FRIENDS,
  normalizeFriendCode,
  weeklyDamage,
  type BossMember,
} from "@/lib/friends";
import { MONSTERS } from "@/lib/battle/monsters";

const member = (userId: string, weeks: Record<string, number>, over: Partial<BossMember> = {}): BossMember => ({
  userId,
  name: userId,
  level: 10,
  weeks,
  since: "2026-10-26",
  isMe: false,
  ...over,
});

const WEEK = "2026-11-02";
const TODAY = "2026-11-04";

describe("friend codes", () => {
  it("are 8 letters and numbers without look alikes, from the random source given", () => {
    expect(generateFriendCode(() => 0)).toBe("AAAAAAAA");
    expect(generateFriendCode(() => 0.999999)).toBe("99999999");
    let n = 0;
    const code = generateFriendCode(() => ((n += 7) % 32) / 32);
    expect(code).toHaveLength(FRIEND_CODE_LENGTH);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it("are shown with a dash and read back from any case, with a dash or spaces", () => {
    expect(formatFriendCode("ABCD2345")).toBe("ABCD-2345");
    expect(normalizeFriendCode("abcd-2345")).toBe("ABCD2345");
    expect(normalizeFriendCode(" ABCD 2345 ")).toBe("ABCD2345");
  });

  it("refuse anything that cannot be a code", () => {
    for (const bad of ["", "ABCD", "ABCD-234", "ABCD-23456", "ABCD-O123", "ABCD-I123", "ABC<-2345", null, undefined, 12345678]) {
      expect(normalizeFriendCode(bad), String(bad)).toBeNull();
    }
  });
});

describe("the weeks of damage", () => {
  it("add up the days of each week, Monday to Sunday", () => {
    const days = new Map([
      ["2026-11-01", 100], // Sunday of the week before
      ["2026-11-02", 200],
      ["2026-11-08", 300],
      ["2026-11-09", 50.4],
    ]);
    expect(weeklyDamage(days)).toEqual({ "2026-10-26": 100, "2026-11-02": 500, "2026-11-09": 50 });
  });

  it("start to count for a boss the Monday after a friendship was accepted", () => {
    expect(countsFromWeek("2026-11-02")).toBe("2026-11-09");
    expect(countsFromWeek("2026-11-08")).toBe("2026-11-09");
    expect(countsFromWeek("2026-11-09")).toBe("2026-11-16");
  });
});

describe("the group of a player", () => {
  const links = [
    { id: "l1", otherId: "u1", name: "Ayu", level: 20, direction: "incoming" as const, status: "accepted" as const, acceptedOn: "2026-10-27" },
    { id: "l2", otherId: "u2", name: "Budi", level: 12, direction: "outgoing" as const, status: "pending" as const, acceptedOn: null },
  ];
  const damage = [
    { user_id: "u1", week_start: WEEK, damage: 700 },
    { user_id: "u2", week_start: WEEK, damage: 999 },
    { user_id: "u3", week_start: WEEK, damage: 5 },
  ];

  it("is the player with their own live numbers plus accepted friends, and never a pending one or a stranger", () => {
    const members = buildMembers({ me: { userId: "me", name: "Me", level: 9, weeks: { [WEEK]: 400 } }, links, damage });
    expect(members.map((m) => m.userId)).toEqual(["me", "u1"]);
    expect(members[0]).toMatchObject({ isMe: true, weeks: { [WEEK]: 400 } });
    expect(members[1]).toMatchObject({ name: "Ayu", level: 20, weeks: { [WEEK]: 700 }, since: "2026-11-02" });
  });
});

describe("the friends boss", () => {
  const me = member("me", { [WEEK]: 3000 }, { isMe: true, name: "Me" });

  it("needs at least one friend, and does not exist before the first week", () => {
    expect(friendBossFor([me], WEEK, TODAY)).toBeNull();
    expect(friendBossFor([me, member("a", {})], "2026-10-19", "2026-10-21")).toBeNull();
  });

  it("does not count a friend who joined this week until Monday", () => {
    const late = member("a", { [WEEK]: 9999 }, { since: "2026-11-09" });
    expect(friendBossFor([me, late], WEEK, TODAY)).toBeNull();
    const next = friendBossFor([me, late], "2026-11-09", "2026-11-10")!;
    expect(next.members).toHaveLength(2);
  });

  it("has HP of 80 percent of what the group usually deals, at least 2,500 for each member", () => {
    const earlier = (damage: number) => ({ "2026-10-26": damage, "2026-10-19": damage, "2026-10-12": damage, "2026-10-05": damage });
    const members = [member("me", earlier(10_000), { isMe: true }), member("a", earlier(5_000))];
    expect(friendBossHp(members, WEEK)).toBe(12_000);
    // Nobody trained before: the floor.
    expect(friendBossHp([member("me", {}, { isMe: true }), member("a", {}), member("b", {})], WEEK)).toBe(3 * FRIEND_BOSS_MIN_HP_PER_MEMBER);
  });

  it("looks at the 4 most recent weeks a member trained, before the boss week and never the week itself", () => {
    const weeks = { "2026-10-26": 4000, "2026-10-19": 0, "2026-10-12": 2000, "2026-10-05": 6000, "2026-09-28": 1000, "2026-09-21": 100_000, [WEEK]: 77_777 };
    // Trained weeks: 4000, 2000, 6000, 1000 (the idle week is skipped, the 100,000 is the fifth). Average 3250, times 0.8 is 2600, but two members need 5000.
    expect(friendBossHp([member("me", weeks, { isMe: true }), member("a", {})], WEEK)).toBe(5000);
    const big = Object.fromEntries(Object.entries(weeks).map(([w, d]) => [w, w === WEEK ? d : d === 100_000 ? d : d * 10]));
    // 40,000, 20,000, 60,000, 10,000: average 32,500, times 0.8.
    expect(friendBossHp([member("me", big, { isMe: true }), member("a", {})], WEEK)).toBe(26_000);
  });

  it("adds up everyone's damage, ranks them, and is cleared when the HP is reached", () => {
    const members = [me, member("a", { [WEEK]: 5000 }), member("b", { [WEEK]: 0 }), member("c", { [WEEK]: 1000 })];
    const boss = friendBossFor(members, WEEK, TODAY)!;
    expect(boss.damage).toBe(9000);
    expect(boss.hp).toBe(10_000);
    expect(boss.cleared).toBe(false);
    expect(boss.hpLeft).toBe(1000);
    expect(boss.progress).toBeCloseTo(0.9);
    expect(boss.members.map((m) => [m.name, m.place])).toEqual([["a", 1], ["Me", 2], ["c", 3], ["b", 0]]);
    expect(boss.members.reduce((sum, m) => sum + m.share, 0)).toBeCloseTo(1);
    expect(friendBossFor([...members.slice(0, 3), member("c", { [WEEK]: 2000 })], WEEK, TODAY)!.cleared).toBe(true);
  });

  it("is a different awakened monster every week, the same for the whole group", () => {
    expect(friendMonsterFor(WEEK).name.startsWith("Awakened ")).toBe(true);
    expect(friendMonsterFor(WEEK).id).toBe(friendMonsterFor(WEEK).id);
    // Six weeks in a row go through all six monsters.
    const weeks = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07"];
    expect(new Set(weeks.map((w) => friendMonsterFor(w).id)).size).toBe(MONSTERS.length);
  });
});

describe("the chests of the friends boss", () => {
  const AFTER = "2026-11-12"; // the week of 9 Nov, so the week of 2 Nov is over
  const fighters = (mine: number, others: number[]) => [
    member("me", { [WEEK]: mine }, { isMe: true, name: "Me" }),
    ...others.map((d, i) => member(`f${i}`, { [WEEK]: d }, { name: `F${i}` })),
  ];

  it("name the weeks that are over, with the oldest that still counts first", () => {
    expect(finishedWeeks("2026-11-12")).toEqual(["2026-10-26", "2026-11-02"]);
    expect(finishedWeeks("2026-10-28")).toEqual([]);
    expect(finishedWeeks("2026-12-10")).toEqual(["2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
  });

  it("give a friends chest to everyone who dealt damage when the boss fell, dated the Monday after", () => {
    // Two members: 5,000 HP at least, 3,000 + 2,500 = 5,500.
    const chests = friendChests(fighters(3000, [2500]), AFTER);
    expect(chests).toEqual([{ id: `f:${WEEK}`, kind: "friends", earnedOn: "2026-11-09", expiresOn: "2026-11-23" }]);
  });

  it("give nothing when the boss survived, or when you dealt no damage", () => {
    expect(friendChests(fighters(1000, [1000]), AFTER)).toEqual([]);
    expect(friendChests(fighters(0, [9000]), AFTER)).toEqual([]);
  });

  it("give nothing for the week that is still on", () => {
    expect(friendChests(fighters(9000, [9000]), TODAY)).toEqual([]);
  });

  it("give the better MVP chest to the top 3, but only in a group of 4 or more", () => {
    // Four fighters need 10,000 damage together.
    const four = fighters(4000, [3000, 2500, 1000]);
    expect(friendChests(four, AFTER).map((c) => c.id)).toEqual([`t:${WEEK}`]);
    const fourth = [member("me", { [WEEK]: 50 }, { isMe: true, name: "Me" }), ...[4000, 3500, 3000].map((d, i) => member(`f${i}`, { [WEEK]: d }))];
    expect(friendChests(fourth, AFTER).map((c) => c.id)).toEqual([`f:${WEEK}`]);
    // A group of 3 never has an MVP, even for first place.
    expect(friendChests(fighters(5000, [3000, 2000]), AFTER).map((c) => c.id)).toEqual([`f:${WEEK}`]);
  });

  it("pay one chest a week: once one is open, a late change of the ranking cannot pay another", () => {
    const four = fighters(4000, [3000, 2500, 1000]);
    expect(friendChests(four, AFTER, new Set([`f:${WEEK}`])).map((c) => c.id)).toEqual([`f:${WEEK}`]);
    expect(friendChests(four, AFTER, new Set([`t:${WEEK}`])).map((c) => c.id)).toEqual([`t:${WEEK}`]);
  });
});

describe("the two chests", () => {
  it("have ids, kinds and colors of their own", () => {
    expect(isChestId("f:2026-11-02")).toBe(true);
    expect(isChestId("t:2026-11-02")).toBe(true);
    expect(isChestId("x:2026-11-02")).toBe(false);
    expect(chestKind("f:2026-11-02")).toBe("friends");
    expect(chestKind("t:2026-11-02")).toBe("mvp");
    expect(chestId("friends", "2026-11-04")).toBe("f:2026-11-02");
    expect(chestId("mvp", "2026-11-04")).toBe("t:2026-11-02");
    expect(CHEST_TIER.friends).toBe("rare");
    expect(CHEST_TIER.mvp).toBe("epic");
  });

  it("add up to 100 percent, keep Mythic for the season chest, and make the MVP chest the better one", () => {
    for (const kind of ["friends", "mvp"] as const) {
      expect(Object.values(CHEST_ODDS[kind]).reduce((a, b) => a + b, 0), kind).toBe(100);
      expect(CHEST_ODDS[kind].mythic).toBe(0);
      expect(CHEST_PITY[kind].after).toBeGreaterThan(0);
    }
    expect(CHEST_ODDS.mvp.epic + CHEST_ODDS.mvp.legendary).toBeGreaterThan(CHEST_ODDS.friends.epic + CHEST_ODDS.friends.legendary);
    expect(CHEST_ODDS.mvp.common + CHEST_ODDS.mvp.uncommon).toBe(0);
  });

  it("allow 10 friends", () => {
    expect(MAX_FRIENDS).toBe(10);
  });
});
