import { addDays, format, parseISO, startOfDay } from "date-fns";
import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { ISO_FORMAT } from "@/lib/dates";
import { listAvailability } from "@/lib/repositories/availability";
import { listSessions } from "@/lib/repositories/workouts";
import { suggestSlots, typicalDurationMinutes } from "@/lib/scheduling";
import { formatDuration } from "@/lib/workout";

const MAX_REASONS = 3;

function dayLabel(date: string, now: Date): string {
  const today = format(startOfDay(now), ISO_FORMAT);
  if (date === today) return "Today";
  if (date === format(addDays(startOfDay(now), 1), ISO_FORMAT)) return "Tomorrow";
  return format(parseISO(date), "EEEE");
}

export async function BestTimesPanel() {
  const userId = await getCurrentUserId();
  const [blocks, sessions] = await Promise.all([listAvailability(userId), listSessions(userId)]);

  const now = new Date();
  const duration = typicalDurationMinutes(sessions);
  const slots = suggestSlots({ blocks, sessions, now, durationMinutes: duration });

  return (
    <Panel label="Best times to train" tour="best-times">
      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No free slot in the next 7 days. Check your commitments below.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Slots of {formatDuration(duration)}, your typical workout length, that fit around your
            commitments with a 30 minute travel buffer.
          </p>
          <ol className="flex flex-col divide-y border">
            {slots.map((slot, index) => (
              <li key={slot.date} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {index === 0 ? "Best" : `Option ${index + 1}`}
                  </p>
                  <p className="text-xl font-semibold">
                    {dayLabel(slot.date, now)}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {format(parseISO(slot.date), "d MMM")}
                    </span>
                  </p>
                  <p className="tabular text-2xl">
                    {slot.start} <span className="text-sm text-muted-foreground">to</span> {slot.end}
                  </p>
                </div>
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground sm:max-w-xs sm:text-right">
                  {slot.reasons.slice(0, MAX_REASONS).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Panel>
  );
}
