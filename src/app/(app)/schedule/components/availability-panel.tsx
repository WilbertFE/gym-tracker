import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { listAvailability } from "@/lib/repositories/availability";
import { AvailabilityForm } from "./availability-form";
import { AvailabilityList } from "./availability-list";
import { WeekCalendar } from "./week-calendar";

export async function AvailabilityPanel() {
  const userId = await getCurrentUserId();
  const blocks = await listAvailability(userId);

  return (
    <>
      <Panel label="Weekly commitments">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Classes, work and anything else that repeats every week. Training times are suggested
            around them.
          </p>
          <WeekCalendar blocks={blocks} />
        </div>
      </Panel>
      <Panel label="All commitments">
        <AvailabilityList blocks={blocks} />
      </Panel>
      <Panel label="Add with exact times">
        <AvailabilityForm />
      </Panel>
    </>
  );
}
