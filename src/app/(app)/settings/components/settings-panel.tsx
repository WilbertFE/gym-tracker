import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { getSettings } from "@/lib/repositories/settings";
import { SettingsForm } from "./settings-form";

export async function SettingsPanel() {
  const userId = await getCurrentUserId();
  const settings = await getSettings(userId);

  return (
    <Panel label="Preferences">
      <SettingsForm initial={settings} />
    </Panel>
  );
}
