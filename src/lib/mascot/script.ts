import { pageHelp } from "./pages";
import { suggestNext } from "./suggest";
import { tourForPath } from "./tours";
import type { Mood, NodeArgs, RenderedNode, Reply, SeraContext } from "./types";

/**
 * Sera's dialogue, as data. A node is what she says (a mood and a few short lines, some worked out from what she
 * knows about you) and the buttons you can tap. Her voice is calm and warm, with short lines, in the tone of the
 * System notices. Keep every line short: it has to fit a speech bubble.
 */
type NodeDef = (ctx: SeraContext, args: NodeArgs) => { mood: Mood; lines: string[]; replies: Reply[] };

const BACK: Reply = { label: "Back", next: "menu" };
const CLOSE: Reply = { label: "Okay", action: "close" };

const NODES: Record<string, NodeDef> = {
  menu: (ctx, args) => {
    const tour = tourForPath(args.path ?? "");
    const canTour = tour !== undefined && (tour.feature === null || ctx.open[tour.feature]);
    return {
      mood: "calm",
      lines: ["What would you like to know?"],
      replies: [
        { label: "What should I do next?", next: "next" },
        ...(canTour ? [{ label: "Show me around this page", tour: "here" } as Reply] : []),
        { label: "How does XP work?", next: "xp" },
        { label: "What is locked?", next: "locked" },
        { label: "About this page", next: "page" },
        ...(ctx.locked.length > 0 ? [{ label: "Show me everything now", next: "showAllAsk" } as Reply] : []),
        { label: "Be quiet for today", action: "quietToday" },
        { label: "Turn Sera off", action: "off" },
      ],
    };
  },

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

  chest: () => ({
    mood: "happy",
    lines: ["A chest is waiting for you.", "It holds a cosmetic item, and it runs out after a while."],
    replies: [{ label: "Open it", href: "/dashboard" }, { label: "Later", action: "close" }],
  }),

  tourOffer: () => ({
    mood: "happy",
    lines: ["Want a quick tour of this page?", "I will point at each part and keep it short."],
    replies: [{ label: "Yes, show me", tour: "here" }, { label: "No thanks", action: "close" }],
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
