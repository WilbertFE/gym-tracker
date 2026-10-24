import { format, parseISO } from "date-fns";
import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import {
  addDaysISO,
  formatDelta,
  formatKgDelta,
  formatMinutesDelta,
  summarizeWeek,
  weekRange,
} from "@/lib/week";
import { formatDuration } from "@/lib/workout";
import { cn } from "@/lib/utils";

export async function WeekPanel() {
  const userId = await getCurrentUserId();
  const [sessions, sets] = await Promise.all([listSessions(userId), listAllSets(userId)]);

  const today = todayISO();
  const { start, end } = weekRange(today);
  const current = summarizeWeek(sessions, sets, start);
  const previous = summarizeWeek(sessions, sets, addDaysISO(start, -7));

  const maxVolume = Math.max(...current.days.map((d) => d.volume), 1);
  const label = `This week, ${format(parseISO(start), "d MMM")} to ${format(parseISO(end), "d MMM")}`;

  return (
    <Panel label={label}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat
            label="Workouts"
            value={current.sessions}
            hint={`${formatDelta(current.sessions - previous.sessions)} vs last week`}
          />
          <Stat
            label="Time"
            value={current.minutes > 0 ? formatDuration(current.minutes) : "0m"}
            hint={`${formatMinutesDelta(current.minutes - previous.minutes)} vs last week`}
          />
          <Stat
            label="Volume"
            value={Math.round(current.volume).toLocaleString("en-US")}
            unit="kg"
            hint={`${formatKgDelta(current.volume - previous.volume)} vs last week`}
          />
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
                : `${day.sessions} workout${day.sessions === 1 ? "" : "s"}, ${Math.round(day.volume).toLocaleString("en-US")} kg`;
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
