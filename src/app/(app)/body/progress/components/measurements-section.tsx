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
    <>
      <Panel label="Log measurements">
        <MeasurementForm today={todayISO()} />
      </Panel>
      <Panel label="Measurement history">
        <div className="overflow-x-auto">
          <MeasurementHistory rowsDesc={rows} />
        </div>
      </Panel>
    </>
  );
}
