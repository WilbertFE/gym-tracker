import { describe, expect, it } from "vitest";
import { renderStage, STAGE_IDS } from "@/lib/mascot/beats";
import { buildContext, type ContextInput } from "@/lib/mascot/context";
import { PAGE_LINES_FOR_TEST } from "@/lib/mascot/pages";
import { NODE_IDS, renderNode } from "@/lib/mascot/script";
import { suggestNext } from "@/lib/mascot/suggest";
import { TOURS } from "@/lib/mascot/tours";
import type { SeraContext } from "@/lib/mascot/types";
import { xpForLevel } from "@/lib/xp";

/**
 * Her personality is smug, vain and impatient, and secretly caring. She may tease the situation ("so we are deciding to be
 * gym decor today?") but never the person: no insults about the body, the effort or the ability. This reads every line she can
 * say and checks it against a list of words she must never use, so a future edit cannot slip one in.
 */
const BANNED = ["stupid", "idiot", "lazy", "fat", "ugly", "weak", "pathetic", "loser", "useless", "worthless", "dumb", "hopeless", "disgusting", "skinny", "failure"];

const input = (over: Partial<ContextInput> = {}): ContextInput => ({
  today: "2026-11-10",
  level: 1,
  totalXp: 0,
  xpToNext: 13,
  nextRank: { name: "Iron Rookie", minLevel: 5 },
  showAll: false,
  guide: [{ id: "checkin", done: false }],
  checkinKind: null,
  checkinDates: [],
  sessionsToday: [],
  finishedWorkouts: 0,
  chestsWaiting: 0,
  quests: null,
  lastActivity: null,
  gate: { weekStart: "2026-11-09", name: "Gate of Iron", boss: "Stone Warden", rank: "C", xp: 40, booster: false, cleared: true },
  ...over,
});

const contexts: SeraContext[] = [
  buildContext(input()),
  buildContext(input({ level: 10, totalXp: xpForLevel(10), checkinKind: "gym", quests: { done: 0, total: 3 }, finishedWorkouts: 2 })),
  buildContext(input({ level: 10, totalXp: xpForLevel(10), checkinKind: "gym", sessionsToday: [{ ended: false }], quests: { done: 1, total: 3 } })),
  buildContext(input({ level: 33, totalXp: xpForLevel(33), checkinKind: "gym", sessionsToday: [{ ended: true }], quests: { done: 3, total: 3 }, chestsWaiting: 2, lastActivity: "2026-11-05", finishedWorkouts: 40 })),
  buildContext(input({ level: 10, totalXp: xpForLevel(10), checkinKind: "gym", sessionsToday: [{ ended: true }], quests: { done: 0, total: 3 } })),
  buildContext(input({ showAll: true })),
];

function everyLine(): string[] {
  const lines: string[] = [];
  for (const c of contexts) {
    for (const id of NODE_IDS) {
      const n = renderNode(id, c, { path: "/dashboard", featureId: "body" });
      lines.push(...n.lines, ...n.replies.map((r) => r.label));
    }
    for (const id of STAGE_IDS) {
      const s = renderStage(id, c, { features: ["body", "quests"], days: 14 });
      lines.push(s.tag, ...s.beats, ...s.facts, ...s.replies.map((r) => r.label));
    }
    const s = suggestNext(c);
    lines.push(...s.lines, ...(s.action ? [s.action.label] : []));
  }
  for (const t of TOURS) for (const step of t.steps) lines.push(step.title, step.text);
  lines.push(...PAGE_LINES_FOR_TEST);
  return lines;
}

describe("her voice", () => {
  const lines = everyLine();

  it("says plenty, so the check below is not empty", () => {
    expect(lines.length).toBeGreaterThan(150);
  });

  it("never insults the person: no banned word in anything she can say", () => {
    for (const line of lines) {
      for (const word of BANNED) expect(line.toLowerCase(), `"${line}" has "${word}"`).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });

  it("never uses an em dash", () => {
    for (const line of lines) expect(line, line).not.toContain("—");
  });

  it("never uses the name of any franchise character, house or the trend she was inspired by", () => {
    const forbidden = ["malfoy", "malfoid", "draco", "hogwarts", "slytherin", "harry potter", "foid"];
    for (const line of lines) for (const word of forbidden) expect(line.toLowerCase(), line).not.toContain(word);
  });

  it("keeps her attitude: she is smug somewhere, flustered somewhere, and teases without being cruel", () => {
    const text = lines.join(" ").toLowerCase();
    expect(text).toContain("hmph");
    expect(text).toContain("not that i");
    expect(text).toContain("gym decor");
    expect(text).toContain("keep an eye on");
  });

  it("still gives the real information: what to do next names a real action", () => {
    for (const c of contexts) {
      const s = suggestNext(c);
      expect(s.lines.length).toBeGreaterThan(0);
      if (s.action) expect(s.action.href).toMatch(/^\//);
    }
    expect(suggestNext(contexts[0]).action?.href).toBe("/dashboard#daily-checkin");
  });
});
