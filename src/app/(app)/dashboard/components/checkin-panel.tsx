import { format, parseISO, subDays } from "date-fns";
import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { getCurrentUserId } from "@/lib/auth";
import { ISO_FORMAT, todayISO } from "@/lib/dates";
import { listCheckins } from "@/lib/repositories/checkins";
import { computeStreak } from "@/lib/streak";
import { cn } from "@/lib/utils";
import { CheckinForm } from "./checkin-form";

export async function CheckinPanel() {
  const userId = await getCurrentUserId();
  const checkins = await listCheckins(userId);
  const today = todayISO();

  const streak = computeStreak(
    checkins.map((c) => c.date),
    today,
  );
  const todays = checkins.find((c) => c.date === today) ?? null;

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(parseISO(today), 6 - i), ISO_FORMAT);
    return { date, checkin: checkins.find((c) => c.date === date) ?? null };
  });
  const gymDays = week.filter((d) => d.checkin?.went_to_gym).length;

  return (
    <Panel label="Daily check-in">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Streak" value={streak.current} unit="d" />
            <Stat label="Best" value={streak.longest} unit="d" />
            <Stat label="Gym, 7d" value={gymDays} unit="x" />
          </div>

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              Last 7 days
            </p>
            <ul className="grid grid-cols-7 gap-1">
              {week.map(({ date, checkin }) => {
                const state = checkin
                  ? checkin.went_to_gym
                    ? "gym"
                    : "rest"
                  : "none";
                const label = `${format(parseISO(date), "EEEE d MMM")}: ${
                  state === "gym" ? "went to the gym" : state === "rest" ? "rest day" : "no check-in"
                }`;
                return (
                  <li key={date} className="flex flex-col items-center gap-1">
                    <span
                      role="img"
                      aria-label={label}
                      className={cn(
                        "h-8 w-full border",
                        state === "gym" && "border-primary bg-primary",
                        state === "rest" && "border-primary bg-transparent",
                      )}
                    />
                    <span className="tabular text-[10px] uppercase text-muted-foreground">
                      {format(parseISO(date), "EEEEE")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <CheckinForm today={today} existing={todays} />
      </div>
    </Panel>
  );
}
