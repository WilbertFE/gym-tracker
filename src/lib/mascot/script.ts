import { pageHelp } from "./pages";
import { suggestNext } from "./suggest";
import { tourForPath } from "./tours";
import type { Mood, NodeArgs, RenderedNode, Reply, SeraContext } from "./types";

/**
 * Sera's dialogue, as data. A node is what she says (a mood and a few short lines, some worked out from what she
 * knows about you) and the buttons you can tap. Her voice is smug, vain and impatient, and secretly caring: she
 * teases the situation and never the person, and she always says the real thing. Keep every line short: it has to fit a speech bubble.
 */
type NodeDef = (ctx: SeraContext, args: NodeArgs) => { mood: Mood; lines: string[]; replies: Reply[] };

const BACK: Reply = { label: "Back", next: "menu" };
const CLOSE: Reply = { label: "Okay", action: "close" };

const NODES: Record<string, NodeDef> = {
  menu: (ctx, args) => {
    const tour = tourForPath(args.path ?? "");
    const canTour = tour !== undefined && (tour.feature === null || ctx.open[tour.feature]);
    return {
      mood: "smug",
      lines: ["Hmph. Need something? Ask. I know everything here."],
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
    mood: "smug",
    lines: ["Oh. You again, Player.", "I am Sera. I run the guide here, and I only speak up when it matters.", "Tap me if you need me. Or quiet me in Settings, if you must."],
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
    lines: ["Everything you log earns XP: check-ins, sets, workouts, weigh-ins.", "Early levels come fast. Do not let it go to your head, each one takes a little more."],
    replies: [{ label: "Tell me about ranks", next: "ranks" }, BACK],
  }),
  ranks: (ctx) => ({
    mood: "smug",
    lines: [
      "Every few levels you earn a new rank and a badge. Try to look impressed.",
      ctx.nextRank
        ? `Your next rank is ${ctx.nextRank.name}, at level ${ctx.nextRank.level}. ${ctx.nextRank.xpAway.toLocaleString("en-US")} XP to go. Not that I am counting.`
        : "You already hold the highest rank. Obviously.",
    ],
    replies: [BACK],
  }),

  locked: (ctx) => {
    if (ctx.locked.length === 0) return { mood: "flustered", lines: ["Everything is open.", "...Fine. Well done, Player."], replies: [BACK] };
    const upcoming = ctx.locked.slice(0, 4);
    return {
      mood: "calm",
      lines: ["Here is what opens next.", ...upcoming.map((f) => `Level ${f.level}: ${f.name}`), "It opens fast if you actually train."],
      replies: [{ label: "Show me everything now", next: "showAllAsk" }, BACK],
    };
  },

  page: (_ctx, args) => {
    const help = pageHelp(args.path);
    return {
      mood: "thinking",
      lines: help ? help.lines : ["I have no notes on this page yet.", "Ask me what to do next instead."],
      replies: [{ label: "What should I do next?", next: "next" }, BACK],
    };
  },

  showAllAsk: () => ({
    mood: "surprised",
    lines: ["That opens every page and feature at once.", "The first days go better one step at a time. Sure you want the chaos?"],
    replies: [
      { label: "Yes, show everything", action: "showAll" },
      { label: "No, keep it simple", next: "menu" },
    ],
  }),

  quietDone: () => ({ mood: "annoyed", lines: ["Fine. Quiet for today.", "Tap me if you need anything. You will."], replies: [CLOSE] }),
  offDone: () => ({ mood: "annoyed", lines: ["Hmph. I will stay out of the way.", "Turn me back on in Settings, under Sera, when you miss me."], replies: [CLOSE] }),
  allOpen: () => ({ mood: "smug", lines: ["Everything is open now.", "Do not blame me if it feels like a lot. Settings turns it off again."], replies: [CLOSE] }),

  lockedPage: (ctx, args) => {
    const feature = args.featureId ? ctx.locked.find((f) => f.id === args.featureId) : undefined;
    if (!feature) {
      return { mood: "smug", lines: ["This one is not open yet.", "Keep training, it comes quickly."], replies: [{ label: "What should I do next?", next: "next" }, CLOSE] };
    }
    return {
      mood: "thinking",
      lines: [
        `${feature.name} is locked for now.`,
        `It opens at level ${feature.level}. You are level ${ctx.level}, ${feature.xpAway.toLocaleString("en-US")} XP away. Patience.`,
        "The first days are for the main routine.",
      ],
      replies: [{ label: "What should I do next?", next: "next" }, { label: "Show me everything now", next: "showAllAsk" }, CLOSE],
    };
  },

  chest: () => ({
    mood: "smug",
    lines: ["There is a chest waiting for you.", "It holds a cosmetic item, and it expires. I will not remind you twice."],
    replies: [{ label: "Open it", href: "/dashboard" }, { label: "Later", action: "close" }],
  }),

  tourOffer: () => ({
    mood: "happy",
    lines: ["Want a quick tour of this page?", "I will point at each part and keep it short. Not that you need it."],
    replies: [{ label: "Yes, show me", tour: "here" }, { label: "No thanks", action: "close" }],
  }),

  poked: () => ({
    mood: "flustered",
    lines: ["H-hey! Stop poking me!", "I am not a button. ...Okay, I am a button. But still."],
    replies: [{ label: "Sorry, sorry", action: "close" }, { label: "What can you do?", next: "menu" }],
  }),

  nudge: () => ({
    mood: "smug",
    lines: ["Oh, you are here.", "Today's check-in is still empty. Go on."],
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
