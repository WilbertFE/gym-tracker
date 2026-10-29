import type { SeraContext } from "./types";

export type Suggestion = {
  lines: string[];
  /** Where to go to do it, with the words for the button. */
  action: { label: string; href: string } | null;
};

/**
 * What to do next, in the order a day goes: check in, train, finish, then the quests and chests that are open,
 * the weight step, and last the next unlock. It never points at something that is still locked.
 */
export function suggestNext(ctx: SeraContext): Suggestion {
  if (ctx.checkinKind === null) {
    return {
      lines: ["Start with today's check-in.", "Tell me how you trained: the gym, a workout at home, or a rest day. It takes a few seconds."],
      action: { label: "Go to the check-in", href: "/dashboard#daily-checkin" },
    };
  }

  if (ctx.checkinKind !== "rest" && !ctx.workoutToday.started) {
    return {
      lines: ["You are checked in. Now train.", "Start a workout, log your sets between exercises and tap Finish when you are done."],
      action: { label: "Start a workout", href: "/workouts" },
    };
  }

  if (ctx.workoutToday.started && !ctx.workoutToday.finished) {
    return {
      lines: ["Your workout is still open.", "Finish it to bank the XP. It needs at least 3 sets."],
      action: { label: "Back to the workout", href: "/workouts" },
    };
  }

  if (ctx.quests && ctx.quests.done < ctx.quests.total) {
    const left = ctx.quests.total - ctx.quests.done;
    return {
      lines: [`${left} of today's ${ctx.quests.total} quests ${left === 1 ? "is" : "are"} still open.`, "Finish them all for a bonus, and a chest."],
      action: { label: "See the quests", href: "/dashboard" },
    };
  }

  if (ctx.chestsWaiting > 0) {
    return {
      lines: [`${ctx.chestsWaiting === 1 ? "A chest is" : `${ctx.chestsWaiting} chests are`} waiting for you.`, "Open it before it runs out."],
      action: { label: "Open it", href: "/dashboard" },
    };
  }

  if (ctx.open.body && !ctx.guide.weighIn) {
    return {
      lines: ["One small step left: log your weight.", "It is a single number, and it starts your body chart."],
      action: { label: "Log my weight", href: "/body" },
    };
  }

  const next = ctx.locked[0];
  if (next) {
    return {
      lines: [`You are all caught up for today.`, `Next unlock: ${next.name}, at level ${next.level}. You are ${next.xpAway.toLocaleString("en-US")} XP away.`],
      action: null,
    };
  }

  return { lines: ["You are all caught up. Everything is open.", "Come back tomorrow and keep the streak going."], action: null };
}
