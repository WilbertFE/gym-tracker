import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { LocationLine } from "@/components/location-line";
import { MembershipStatusLine, STATE_DOT } from "@/components/membership-status";
import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { membershipStatus } from "@/lib/membership";
import { listMemberships } from "@/lib/repositories/memberships";
import { cn } from "@/lib/utils";
import { MembershipForm } from "./membership-form";

export async function MembershipPanel() {
  const userId = await getCurrentUserId();
  const [current] = await listMemberships(userId);
  const today = todayISO();

  if (!current) {
    return (
      <Panel label="Membership">
        <p className="mb-4 text-sm text-muted-foreground">
          No membership yet. Add your dates to get an expiry warning.
        </p>
        <MembershipForm today={today} existing={null} />
      </Panel>
    );
  }

  const { daysLeft, state } = membershipStatus(current.end_date, today);
  const total = Math.max(
    1,
    differenceInCalendarDays(parseISO(current.end_date), parseISO(current.start_date)),
  );
  const elapsed = Math.min(
    100,
    Math.max(0, (differenceInCalendarDays(parseISO(today), parseISO(current.start_date)) / total) * 100),
  );

  return (
    <div className="flex flex-col gap-6">
      <Panel label={current.gym_name}>
        <div className="flex flex-col gap-4">
          <LocationLine
            gymName={current.gym_name}
            location={current.location}
            latitude={current.latitude}
            longitude={current.longitude}
          />
          <MembershipStatusLine state={state} />

          <div className="grid grid-cols-2 gap-4">
            <Stat
              label={state === "expired" ? "Expired" : "Days left"}
              value={Math.abs(daysLeft)}
              unit={state === "expired" ? "d ago" : "d"}
            />
            <Stat
              label="Ends"
              value={format(parseISO(current.end_date), "d MMM yyyy")}
              className="[&>span:last-child]:text-xl"
            />
          </div>

          <div
            role="progressbar"
            aria-label="Membership period elapsed"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(elapsed)}
            className="h-1 w-full bg-intensity-none"
          >
            <div className={cn("h-full", STATE_DOT[state])} style={{ width: `${elapsed}%` }} />
          </div>

          {state !== "active" && (
            <p className="text-sm text-muted-foreground">
              {state === "expired"
                ? "Your membership has ended. Update the dates after renewing."
                : `Renew within ${daysLeft} day${daysLeft === 1 ? "" : "s"} to keep your access.`}
            </p>
          )}
        </div>
      </Panel>

      <Panel label="Edit membership">
        <MembershipForm today={today} existing={current} />
      </Panel>
    </div>
  );
}
