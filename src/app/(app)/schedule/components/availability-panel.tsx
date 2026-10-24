import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { listAvailability } from "@/lib/repositories/availability";
import { AvailabilityForm } from "./availability-form";
import { AvailabilityList } from "./availability-list";

export async function AvailabilityPanel() {
  const userId = await getCurrentUserId();
  const blocks = await listAvailability(userId);

  return (
    <>
      <Panel label="Weekly commitments">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Classes, work and anything else that repeats every week. Training times are suggested
            around them. Times are on a 24 hour clock.
          </p>
          <AvailabilityList blocks={blocks} />
        </div>
      </Panel>
      <Panel label="Add a commitment">
        <AvailabilityForm />
      </Panel>
    </>
  );
}
