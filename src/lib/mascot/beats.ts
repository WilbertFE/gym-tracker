import { featureById } from "@/lib/unlocks";
import { tourForFeature } from "./tours";
import type { NodeArgs, Reply, SeraContext, StageScript } from "./types";

/**
 * What Sera says when she appears big on the screen, as data. A stage is a few short beats, one card of words at a
 * time, with a pose and a face, and buttons on the last beat. Keep every beat to a sentence or two: it has to read
 * at a glance on a phone. The daily hello is an automatic one: two beats and it closes by itself.
 */
type StageDef = (ctx: SeraContext, args: NodeArgs) => Omit<StageScript, "id">;

const CLOSE = (label: string): Reply => ({ label, action: "close" });

const list = (names: string[]) => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

const STAGES: Record<string, StageDef> = {
  welcome: () => ({
    pose: "wave",
    mood: "happy",
    halo: "blue",
    tag: "System guide",
    beats: ["Welcome, Player.", "I am Sera, your guide. I will keep the first days simple.", "Check in, train, level up. The rest opens as you grow."],
    facts: [],
    replies: [{ label: "Show me around", tour: "dashboard" }, CLOSE("Not now")],
    auto: false,
  }),

  unlock: (ctx, args) => {
    const features = (args.features ?? []).map((id) => featureById(id));
    const first = features[0];
    const tour = first ? tourForFeature(first.id) : undefined;
    return {
      pose: "cheer",
      mood: "cheer",
      halo: "blue",
      tag: "New unlock",
      beats: [`${list(features.map((f) => f.name))} just opened.`, first ? first.blurb : "There is something new to try."],
      facts: [`You are level ${ctx.level}.`],
      replies: [
        ...(first ? [{ label: tour ? "Show me" : "Take me there", href: first.href, ...(tour ? { tour: tour.id } : {}) } as Reply] : []),
        CLOSE("Later"),
      ],
      auto: false,
    };
  },

  boss: (ctx) => {
    const gate = ctx.gate;
    return {
      pose: "cheer",
      mood: "cheer",
      halo: "gold",
      tag: "Gate cleared",
      beats: ["The boss is down.", gate ? `${gate.boss} has fallen. ${gate.name} is cleared.` : "This week's gate is cleared."],
      facts: gate ? [`Rank ${gate.rank} gate`, `+${gate.xp} XP`, ...(gate.booster ? ["A booster is yours"] : [])] : [],
      replies: [{ label: "See the gate", href: "/dashboard" }, CLOSE("Nice")],
      auto: false,
    };
  },

  firstWorkout: () => ({
    pose: "cheer",
    mood: "cheer",
    halo: "blue",
    tag: "First workout",
    beats: ["Your first workout is done. Well done, Player.", "Every set and every workout earns XP, and your level is climbing."],
    facts: [],
    replies: [{ label: "What should I do next?", next: "next" }, CLOSE("Thanks")],
    auto: false,
  }),

  streak: (_ctx, args) => ({
    pose: "cheer",
    mood: "cheer",
    halo: "gold",
    tag: `${args.days ?? 7} day streak`,
    beats: [`${args.days ?? 7} days in a row.`, "That is how a habit is built. Keep it going."],
    facts: [`${args.days ?? 7} days of check-ins`],
    replies: [CLOSE("Thanks")],
    auto: false,
  }),

  comeback: (ctx) => ({
    pose: "wave",
    mood: "sleepy",
    endMood: "happy",
    halo: "blue",
    tag: "Welcome back",
    beats: [`It has been ${ctx.daysAway} days.`, "No pressure. One check-in is enough to get going again."],
    facts: [],
    replies: [{ label: "Check in now", href: "/dashboard#daily-checkin" }, CLOSE("Not today")],
    auto: false,
  }),

  // The first visit of the day: short, and it goes by itself.
  daily: (ctx) => {
    const quests = ctx.quests && ctx.quests.done < ctx.quests.total ? `${ctx.quests.total - ctx.quests.done} quests are waiting today.` : null;
    const beats = ctx.workoutToday.finished
      ? ["Today's workout is done.", "Well done, Player."]
      : ctx.checkinKind === null
        ? ["Good to see you, Player.", "Today's check-in is waiting."]
        : ctx.workoutToday.started
          ? ["Your workout is in progress.", "Finish it to bank the XP."]
          : ["You are checked in.", quests ?? "Ready to train?"];
    return {
      pose: "wave",
      mood: "happy",
      halo: "blue",
      tag: "Today",
      beats,
      facts: [ctx.streak > 1 ? `${ctx.streak} day streak` : `Level ${ctx.level}`],
      replies: ctx.checkinKind === null ? [{ label: "Check in", href: "/dashboard#daily-checkin" }] : [],
      auto: true,
    };
  },
};

export const STAGE_IDS = Object.keys(STAGES);

/** What Sera says and does at a stage. An unknown id falls back to the daily hello, so a bug never leaves a blank screen. */
export function renderStage(id: string, ctx: SeraContext, args: NodeArgs = {}): StageScript {
  const known = id in STAGES;
  const built = STAGES[known ? id : "daily"](ctx, args);
  return { id: known ? id : "daily", ...built };
}
