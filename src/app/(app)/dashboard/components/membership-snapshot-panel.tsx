import { format, parseISO } from "date-fns";
import Link from "next/link";
import { LocationLine } from "@/components/location-line";
import { MembershipStatusLine } from "@/components/membership-status";
import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { membershipStatus } from "@/lib/membership";
import { listMemberships } from "@/lib/repositories/memberships";

const linkClass =
  "inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

export async function MembershipSnapshotPanel() {
  const userId = await getCurrentUserId();
  const [current] = await listMemberships(userId);

  if (!current) {
    return (
      <Panel label="Membership">
        <p className="mb-2 text-sm text-muted-foreground">
          Add your membership dates to get an expiry warning.
        </p>
        <Link href="/membership" className={linkClass}>
          Add membership
        </Link>
      </Panel>
    );
  }

  const { daysLeft, state } = membershipStatus(current.end_date, todayISO());

  return (
    <Panel label={current.gym_name}>
      <div className="flex flex-col gap-4">
        <LocationLine gymName={current.gym_name} location={current.location} />
        <MembershipStatusLine state={state} />
        <Stat
          label={state === "expired" ? "Expired" : "Days left"}
          value={Math.abs(daysLeft)}
          unit={state === "expired" ? "d ago" : "d"}
          hint={`Ends ${format(parseISO(current.end_date), "d MMM yyyy")}`}
        />
        <Link href="/membership" className={linkClass}>
          {state === "active" ? "View membership" : "Update membership"}
        </Link>
      </div>
    </Panel>
  );
}
