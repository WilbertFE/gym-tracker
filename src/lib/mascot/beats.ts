import { featureById } from "@/lib/unlocks";
import { tourForFeature } from "./tours";
import type { NodeArgs, Reply, SeraContext, StageScript } from "./types";

/**
 * What Sera says when she appears big on the screen, as data. A stage is a few short beats, one card of words at a
 * time, with a pose and a face, and buttons on the last beat. Keep every beat to a sentence or two: it has to read
 * at a glance on a phone. The daily hello is an automatic one: two beats and it closes by itself.
 *
 * Her voice: smug, a little vain, impatient, and secretly caring. She always says the real thing, she teases the
 * situation and never the person, and when the user does well she softens and pretends it is nothing.
 */
type StageDef = (ctx: SeraContext, args: NodeArgs) => Omit<StageScript, "id">;

const CLOSE = (label: string): Reply => ({ label, action: "close" });

const list = (names: string[]) => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

const STAGES: Record<string, StageDef> = {
  welcome: () => ({
    pose: "hairflip",
    mood: "smug",
    halo: "blue",
    tag: "System guide",
    beats: ["Hmph. So you finally showed up.", "I am Sera. I will show you around, only because you would get lost otherwise.", "Check in, train, level up. The rest opens as you earn it."],
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
      mood: "flustered",
      endMood: "smug",
      halo: "blue",
      tag: "New unlock",
      beats: [`${list(features.map((f) => f.name))} just opened.`, first ? first.blurb : "There is something new to try.", "Hmph. Your ability is finally showing. I predicted it, of course."],
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
      pose: "smug",
      mood: "smug",
      endMood: "flustered",
      halo: "gold",
      tag: "Gate cleared",
      beats: ["The boss is down.", gate ? `${gate.boss} has fallen. ${gate.name} is cleared.` : "This week's gate is cleared.", "Obviously. ...I mean, well done."],
      facts: gate ? [`Rank ${gate.rank} gate`, `+${gate.xp} XP`, ...(gate.booster ? ["A booster is yours"] : [])] : [],
      replies: [{ label: "See the gate", href: "/dashboard" }, CLOSE("Nice")],
      auto: false,
    };
  },

  firstWorkout: () => ({
    pose: "crossed",
    mood: "flustered",
    halo: "blue",
    tag: "First workout",
    beats: ["Your first workout is done.", "It is not like I was worried. Good work. That is all.", "Every set and workout earns XP, so keep going."],
    facts: [],
    replies: [{ label: "What should I do next?", next: "next" }, CLOSE("Thanks")],
    auto: false,
  }),

  streak: (_ctx, args) => ({
    pose: "smug",
    mood: "smug",
    endMood: "flustered",
    halo: "gold",
    tag: `${args.days ?? 7} day streak`,
    beats: [`${args.days ?? 7} days in a row.`, "Hmph. So it is a habit now. Do not stop, I am watching."],
    facts: [`${args.days ?? 7} days of check-ins`],
    replies: [CLOSE("Thanks")],
    auto: false,
  }),

  comeback: (ctx) => ({
    pose: "crossed",
    mood: "annoyed",
    endMood: "smug",
    halo: "blue",
    tag: "Welcome back",
    beats: ["...You are back.", `${ctx.daysAway} days. This System is rather boring without someone to keep an eye on.`, "Now, let us start again."],
    facts: [],
    replies: [{ label: "Check in now", href: "/dashboard#daily-checkin" }, CLOSE("Not today")],
    auto: false,
  }),

  // The first visit of the day: short, and it goes by itself.
  daily: (ctx) => {
    const quests = ctx.quests && ctx.quests.done < ctx.quests.total ? `${ctx.quests.total - ctx.quests.done} quests are waiting today.` : null;
    const beats = ctx.workoutToday.finished
      ? ["Today's workout is done.", "...Not bad. I mean, as expected."]
      : ctx.checkinKind === null
        ? ["Oh, you are here.", "Today's check-in is still empty. Go on."]
        : ctx.workoutToday.started
          ? ["Your workout is in progress.", "Finish it. Banking the XP is the whole point."]
          : ["Checked in. Good.", quests ?? "Now, train or just stand there?"];
    return {
      pose: "wave",
      mood: "smug",
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
