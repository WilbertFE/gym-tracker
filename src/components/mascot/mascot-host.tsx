import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { loadLevel } from "@/lib/level";
import { buildContext } from "@/lib/mascot/context";
import { getCheckinByDate, listCheckins } from "@/lib/repositories/checkins";
import { listSessions } from "@/lib/repositories/workouts";
import { getShowAll } from "@/lib/unlock-state";
import { Mascot } from "./mascot";

/**
 * Works out what Sera knows about the signed in user, on the server, and hands it to her as plain data. It is only
 * counts, flags and feature names: no weights, photos, places or notes ever go into it.
 */
export async function MascotHost() {
  const userId = await getCurrentUserId();
  const today = todayISO();
  const [game, showAll, checkin, checkins, sessions] = await Promise.all([
    loadLevel(userId),
    getShowAll(),
    getCheckinByDate(userId, today),
    listCheckins(userId),
    listSessions(userId),
  ]);

  const dates = [...checkins.map((c) => c.date), ...sessions.map((s) => s.date)];
  const context = buildContext({
    today,
    level: game.level.level,
    totalXp: game.level.total,
    xpToNext: game.level.toNext,
    nextRank: game.level.nextRank ? { name: game.level.nextRank.name, minLevel: game.level.nextRank.minLevel } : null,
    showAll,
    guide: game.guide.map((g) => ({ id: g.id, done: g.done })),
    checkinKind: checkin?.kind ?? null,
    checkinDates: checkins.map((c) => c.date),
    sessionsToday: sessions.filter((s) => s.date === today).map((s) => ({ ended: s.ended_at !== null })),
    finishedWorkouts: game.xp.workouts,
    chestsWaiting: game.chests.available.length,
    quests: { done: game.quests.daily.filter((q) => q.done).length, total: game.quests.daily.length },
    lastActivity: dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null,
    gate: {
      weekStart: game.gate.gate.weekStart,
      name: game.gate.gate.name,
      boss: game.gate.gate.boss,
      rank: game.gate.gate.rank.letter,
      xp: game.gate.gate.rank.xp,
      booster: game.gate.gate.rank.booster,
      cleared: game.gate.cleared,
    },
  });

  return <Mascot context={context} today={today} />;
}
