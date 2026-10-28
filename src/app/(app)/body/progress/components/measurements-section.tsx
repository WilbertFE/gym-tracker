import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { listMeasurements } from "@/lib/repositories/measurements";
import { MeasurementForm } from "./measurement-form";
import { MeasurementHistory } from "./measurement-history";

export async function MeasurementsSection() {
  const userId = await getCurrentUserId();
  const rows = await listMeasurements(userId);

  return (
    <div className="flex flex-col gap-6">
      <Panel label="Log measurements">
        <MeasurementForm today={todayISO()} />
      </Panel>
      <Panel label="Measurement history">
        <MeasurementHistory rowsDesc={rows} />
      </Panel>
    </div>
  );
}
