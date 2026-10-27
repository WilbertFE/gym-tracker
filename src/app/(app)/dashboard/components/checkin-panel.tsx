import { format, parseISO, subDays } from "date-fns";
import Link from "next/link";
import { EntryPhotos } from "@/components/entry-photos";
import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { getCurrentUserId } from "@/lib/auth";
import { ISO_FORMAT, todayISO } from "@/lib/dates";
import { listCheckins } from "@/lib/repositories/checkins";
import { listLogPhotos } from "@/lib/repositories/logPhotos";
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
  const todaysPhotos = todays
    ? await listLogPhotos(userId, { kind: "checkin", entryId: todays.id })
    : [];

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(parseISO(today), 6 - i), ISO_FORMAT);
    return { date, checkin: checkins.find((c) => c.date === date) ?? null };
  });
  const gymDays = week.filter((d) => d.checkin?.went_to_gym).length;

  return (
    <Panel label="1. Check in">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Stat label="Streak" value={streak.current} unit="d" hint={`Went to the gym ${gymDays}x in the last 7 days`} />
          <ul className="grid grid-cols-7 gap-1" aria-label="Last 7 days">
            {week.map(({ date, checkin }) => {
              const state = checkin ? (checkin.went_to_gym ? "gym" : "rest") : "none";
              const label = `${format(parseISO(date), "EEEE d MMM")}: ${
                state === "gym" ? "went to the gym" : state === "rest" ? "rest day" : "no check-in"
              }`;
              return (
                <li key={date} className="flex flex-col items-center gap-1">
                  <span
                    role="img"
                    aria-label={label}
                    className={cn(
                      "h-6 w-full border",
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

        <CheckinForm today={today} existing={todays} />

        <div className="flex flex-col gap-3 border-t pt-4">
          {todays ? (
            <EntryPhotos kind="checkin" entryId={todays.id} photos={todaysPhotos} />
          ) : (
            <p className="text-sm text-muted-foreground">Check in first, then add photos from the gym.</p>
          )}
          <Link
            href="/dashboard/diary"
            className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Open gym diary
          </Link>
        </div>
      </div>
    </Panel>
  );
}
