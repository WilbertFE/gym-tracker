import type { SeraContext } from "./types";

export type Suggestion = {
  lines: string[];
  /** Where to go to do it, with the words for the button. */
  action: { label: string; href: string } | null;
};

/**
 * What to do next, in the order a day goes: check in, train, finish, then the quests and chests that are open,
 * the weight step, and last the next unlock. It never points at something that is still locked. Her tone is smug and
 * a little impatient, but she always says the real thing to do, and she teases the situation, never the person.
 */
export function suggestNext(ctx: SeraContext): Suggestion {
  if (ctx.checkinKind === null) {
    return {
      lines: ["Start with today's check-in.", "Tell me how you trained: the gym, a home workout or a rest day. Even a rest day counts, so there is no excuse."],
      action: { label: "Go to the check-in", href: "/dashboard#daily-checkin" },
    };
  }

  if (ctx.checkinKind !== "rest" && !ctx.workoutToday.started) {
    return {
      lines: ["You are checked in. Now actually train.", "Start a workout, log your sets between exercises and tap Finish. Every set earns XP."],
      action: { label: "Start a workout", href: "/workouts" },
    };
  }

  if (ctx.workoutToday.started && !ctx.workoutToday.finished) {
    return {
      lines: ["Your workout is still open.", "Finish it to bank the XP. It needs at least 3 sets, in case you forgot."],
      action: { label: "Back to the workout", href: "/workouts" },
    };
  }

  if (ctx.quests && ctx.quests.done < ctx.quests.total) {
    const left = ctx.quests.total - ctx.quests.done;
    if (ctx.quests.done === 0) {
      return {
        lines: ["Oh? So we are deciding to be gym decor today? Interesting.", `But seriously, finish at least one quest. ${left} ${left === 1 ? "is" : "are"} waiting.`],
        action: { label: "See the quests", href: "/dashboard" },
      };
    }
    return {
      lines: [`${left} of today's ${ctx.quests.total} quests ${left === 1 ? "is" : "are"} still open.`, "Finish them all for a bonus and a chest. You are almost there, so do not stop."],
      action: { label: "See the quests", href: "/dashboard" },
    };
  }

  if (ctx.chestsWaiting > 0) {
    return {
      lines: [`${ctx.chestsWaiting === 1 ? "A chest is" : `${ctx.chestsWaiting} chests are`} waiting for you.`, "Open it before it runs out. I am not doing it for you."],
      action: { label: "Open it", href: "/dashboard" },
    };
  }

  if (ctx.open.body && !ctx.guide.weighIn) {
    return {
      lines: ["One small step left: log your weight.", "It is a single number. It starts your body chart."],
      action: { label: "Log my weight", href: "/body" },
    };
  }

  const next = ctx.locked[0];
  if (next) {
    return {
      lines: ["You are all caught up for today. Do not look so pleased, that is my job.", `Next unlock: ${next.name}, at level ${next.level}. You are ${next.xpAway.toLocaleString("en-US")} XP away.`],
      action: null,
    };
  }

  return { lines: ["You are all caught up. Everything is open.", "Come back tomorrow and keep the streak going. If you can."], action: null };
}
