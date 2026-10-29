import { format, parseISO } from "date-fns";
import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { getSettings } from "@/lib/repositories/settings";
import { withBodyweightLoad } from "@/lib/load";
import { listExercises } from "@/lib/repositories/exercises";
import { listWeights } from "@/lib/repositories/weights";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { displayVolume } from "@/lib/units";
import {
  addDaysISO,
  formatDelta,
  summarizeWeek,
  weekRange,
} from "@/lib/week";
import { cn } from "@/lib/utils";

export async function WeekPanel() {
  const userId = await getCurrentUserId();
  const [sessions, loggedSets, settings, exercises, weights] = await Promise.all([
    listSessions(userId),
    listAllSets(userId),
    getSettings(userId),
    listExercises(userId),
    listWeights(userId),
  ]);
  const sets = withBodyweightLoad(loggedSets, exercises, sessions, weights);
  const unit = settings.weight_unit;

  const today = todayISO();
  const { start, end } = weekRange(today);
  const current = summarizeWeek(sessions, sets, start);
  const previous = summarizeWeek(sessions, sets, addDaysISO(start, -7));

  const maxVolume = Math.max(...current.days.map((d) => d.volume), 1);
  const label = `This week, ${format(parseISO(start), "d MMM")} to ${format(parseISO(end), "d MMM")}`;

  return (
    <Panel label={label} tour="week">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <Stat
            label="Workouts"
            value={current.sessions}
            hint={`${formatDelta(current.sessions - previous.sessions)} vs last week`}
          />
          <Stat label="Volume" value={displayVolume(current.volume, unit)} unit={unit} hint="Weight x reps, all sets" />
        </div>

        <ul className="grid grid-cols-7 gap-1" aria-label="Volume per day this week">
          {current.days.map((day) => {
            const isToday = day.date === today;
            const heightPct =
              day.volume > 0
                ? Math.max(8, (day.volume / maxVolume) * 100)
                : day.sessions > 0
                  ? 8
                  : 0;
            const description =
              day.sessions === 0
                ? "no workout"
                : `${day.sessions} workout${day.sessions === 1 ? "" : "s"}, ${displayVolume(day.volume, unit)} ${unit}`;
            return (
              <li key={day.date} className="flex flex-col items-center gap-1">
                <div
                  role="img"
                  aria-label={`${format(parseISO(day.date), "EEEE")}: ${description}`}
                  className="flex h-20 w-full items-end border-b"
                >
                  <div className="w-full bg-primary" style={{ height: `${heightPct}%` }} />
                </div>
                <span
                  className={cn(
                    "tabular text-[10px] uppercase",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {format(parseISO(day.date), "EEE")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
