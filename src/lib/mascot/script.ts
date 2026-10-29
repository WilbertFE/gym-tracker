import { featureById } from "@/lib/unlocks";
import { pageHelp } from "./pages";
import { suggestNext } from "./suggest";
import type { Mood, NodeArgs, RenderedNode, Reply, SeraContext } from "./types";

/**
 * Sera's dialogue, as data. A node is what she says (a mood and a few short lines, some worked out from what she
 * knows about you) and the buttons you can tap. Her voice is calm and warm, with short lines, in the tone of the
 * System notices. Keep every line short: it has to fit a speech bubble.
 */
type NodeDef = (ctx: SeraContext, args: NodeArgs) => { mood: Mood; lines: string[]; replies: Reply[] };

const BACK: Reply = { label: "Back", next: "menu" };
const CLOSE: Reply = { label: "Okay", action: "close" };

const list = (names: string[]) => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

const NODES: Record<string, NodeDef> = {
  menu: (ctx) => ({
    mood: "calm",
    lines: ["What would you like to know?"],
    replies: [
      { label: "What should I do next?", next: "next" },
      { label: "How does XP work?", next: "xp" },
      { label: "What is locked?", next: "locked" },
      { label: "About this page", next: "page" },
      ...(ctx.locked.length > 0 ? [{ label: "Show me everything now", next: "showAllAsk" } as Reply] : []),
      { label: "Be quiet for today", action: "quietToday" },
      { label: "Turn Sera off", action: "off" },
    ],
  }),

  welcome: () => ({
    mood: "happy",
    lines: ["Welcome, Player.", "I am Sera, your guide. I will keep the first days simple.", "Check in, train, level up. The rest opens as you grow."],
    replies: [
      { label: "Show me around", next: "tour1" },
      { label: "Not now", action: "close" },
    ],
  }),
  tour1: () => ({
    mood: "calm",
    lines: ["Every day starts with a check-in.", "Tell me how you trained: the gym, a workout at home, or a rest day. Rest days count too."],
    replies: [{ label: "Next", next: "tour2" }],
  }),
  tour2: () => ({
    mood: "calm",
    lines: ["Then you train.", "Log your sets between exercises, and tap Finish when you are done. Every set earns XP."],
    replies: [{ label: "Next", next: "tour3" }],
  }),
  tour3: () => ({
    mood: "happy",
    lines: ["More opens at every level, and I will tell you when it does.", "Tap me any time you need help."],
    replies: [
      { label: "What should I do first?", next: "next" },
      { label: "Got it", action: "close" },
    ],
  }),

  intro: () => ({
    mood: "calm",
    lines: ["Hello again, Player.", "I am Sera, your guide. I stay out of the way until something needs saying.", "Tap me when you want help. You can quiet me in Settings."],
    replies: [{ label: "What should I do next?", next: "next" }, CLOSE],
  }),

  next: (ctx) => {
    const suggestion = suggestNext(ctx);
    return {
      mood: "thinking",
      lines: suggestion.lines,
      replies: [...(suggestion.action ? [{ label: suggestion.action.label, href: suggestion.action.href } as Reply] : []), BACK],
    };
  },

  xp: () => ({
    mood: "calm",
    lines: ["Everything you log earns XP: check-ins, sets, workouts, weigh-ins.", "Levels come fast at the start and take a little more each time."],
    replies: [{ label: "Tell me about ranks", next: "ranks" }, BACK],
  }),
  ranks: (ctx) => ({
    mood: "happy",
    lines: [
      "Every few levels you earn a new rank, with its own badge.",
      ctx.nextRank
        ? `Your next rank is ${ctx.nextRank.name}, at level ${ctx.nextRank.level}. ${ctx.nextRank.xpAway.toLocaleString("en-US")} XP to go.`
        : "You already hold the highest rank.",
    ],
    replies: [BACK],
  }),

  locked: (ctx) => {
    if (ctx.locked.length === 0) return { mood: "happy", lines: ["Everything is open.", "Nicely done, Player."], replies: [BACK] };
    const upcoming = ctx.locked.slice(0, 4);
    return {
      mood: "calm",
      lines: ["Here is what opens next.", ...upcoming.map((f) => `Level ${f.level}: ${f.name}`), "It comes quickly if you train."],
      replies: [{ label: "Show me everything now", next: "showAllAsk" }, BACK],
    };
  },

  page: (_ctx, args) => {
    const help = pageHelp(args.path);
    return {
      mood: "thinking",
      lines: help ? help.lines : ["I do not have notes on this page yet.", "Ask me what to do next instead."],
      replies: [{ label: "What should I do next?", next: "next" }, BACK],
    };
  },

  showAllAsk: () => ({
    mood: "surprised",
    lines: ["That opens every page and feature at once.", "The first days are easier when they open one at a time. Are you sure?"],
    replies: [
      { label: "Yes, show everything", action: "showAll" },
      { label: "No, keep it simple", next: "menu" },
    ],
  }),

  quietDone: () => ({ mood: "calm", lines: ["Quiet for today.", "Tap me if you need anything."], replies: [CLOSE] }),
  offDone: () => ({ mood: "calm", lines: ["I will stay out of the way.", "You can turn me back on in Settings, under Sera."], replies: [CLOSE] }),
  allOpen: () => ({ mood: "cheer", lines: ["Everything is open now.", "You can switch that off again in Settings."], replies: [CLOSE] }),

  // Moments she speaks up about.
  unlock: (ctx, args) => {
    const ids = args.features ?? [];
    const features = ids.map((id) => featureById(id));
    const first = features[0];
    return {
      mood: "cheer",
      lines: [
        `${list(features.map((f) => f.name))} just opened.`,
        first ? first.blurb : "There is something new to try.",
        `You are level ${ctx.level}.`,
      ],
      replies: [...(first ? [{ label: "Take me there", href: first.href } as Reply] : []), { label: "Later", action: "close" }],
    };
  },

  lockedPage: (ctx, args) => {
    const feature = args.featureId ? ctx.locked.find((f) => f.id === args.featureId) : undefined;
    if (!feature) {
      return { mood: "calm", lines: ["This one is not open yet.", "Keep training, it comes quickly."], replies: [{ label: "What should I do next?", next: "next" }, CLOSE] };
    }
    return {
      mood: "thinking",
      lines: [
        `${feature.name} is locked for now.`,
        `It opens at level ${feature.level}. You are level ${ctx.level}, ${feature.xpAway.toLocaleString("en-US")} XP away.`,
        "The first days are for the main routine.",
      ],
      replies: [{ label: "What should I do next?", next: "next" }, { label: "Show me everything now", next: "showAllAsk" }, CLOSE],
    };
  },

  firstWorkout: () => ({
    mood: "cheer",
    lines: ["Your first workout is done. Well done, Player.", "Every set and every workout earns XP, and your level is climbing."],
    replies: [{ label: "What should I do next?", next: "next" }, { label: "Thanks", action: "close" }],
  }),

  chest: () => ({
    mood: "happy",
    lines: ["A chest is waiting for you.", "It holds a cosmetic item, and it runs out after a while."],
    replies: [{ label: "Open it", href: "/dashboard" }, { label: "Later", action: "close" }],
  }),

  comeback: (ctx) => ({
    mood: "sleepy",
    lines: [`It has been ${ctx.daysAway} days.`, "No pressure. One check-in is enough to get going again."],
    replies: [{ label: "Take me to the check-in", href: "/dashboard#daily-checkin" }, { label: "Not today", action: "close" }],
  }),

  nudge: () => ({
    mood: "happy",
    lines: ["Good to see you.", "Ready for today's check-in?"],
    replies: [{ label: "Take me there", href: "/dashboard#daily-checkin" }, { label: "Later", action: "close" }],
  }),
};

export const NODE_IDS = Object.keys(NODES);

/** What Sera says and offers at a node. An unknown id falls back to the menu, so a bug never leaves her silent. */
export function renderNode(id: string, ctx: SeraContext, args: NodeArgs = {}): RenderedNode {
  const known = id in NODES;
  const built = NODES[known ? id : "menu"](ctx, args);
  return { id: known ? id : "menu", ...built };
}
