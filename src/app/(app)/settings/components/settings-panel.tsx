import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { getSettings } from "@/lib/repositories/settings";
import { getShowAll } from "@/lib/unlock-state";
import { SettingsForm } from "./settings-form";

export async function SettingsPanel() {
  const userId = await getCurrentUserId();
  const [settings, showAll] = await Promise.all([getSettings(userId), getShowAll()]);

  return (
    <Panel label="Preferences">
      <SettingsForm initial={settings} showAll={showAll} />
    </Panel>
  );
}
