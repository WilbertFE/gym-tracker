import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { getSettings } from "@/lib/repositories/settings";
import { getRecoveryEnabled, getShowAll } from "@/lib/unlock-state";
import { SettingsForm } from "./settings-form";

export async function SettingsPanel() {
  const userId = await getCurrentUserId();
  const [settings, showAll, recovery] = await Promise.all([getSettings(userId), getShowAll(), getRecoveryEnabled()]);

  return (
    <Panel label="Preferences">
      <SettingsForm initial={settings} showAll={showAll} recovery={recovery} />
    </Panel>
  );
}
