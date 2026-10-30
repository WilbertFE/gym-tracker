import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { getSettings } from "@/lib/repositories/settings";
import { getQuickChests, getRecoveryEnabled, getShowAll } from "@/lib/unlock-state";
import { FeatureSwitches } from "./feature-switches";
import { GameEffects } from "./game-effects";
import { SettingsForm } from "./settings-form";

/** Three panels, so each setting has one obvious home: how the app shows your data, how loud the game is, and what it shows. */
export async function SettingsPanel() {
  const userId = await getCurrentUserId();
  const [settings, showAll, recovery, quickChests] = await Promise.all([
    getSettings(userId),
    getShowAll(),
    getRecoveryEnabled(),
    getQuickChests(),
  ]);

  return (
    <>
      <Panel label="Display">
        <SettingsForm initial={settings} />
      </Panel>
      <Panel label="Game effects">
        <GameEffects quickChests={quickChests} />
      </Panel>
      <Panel label="Features">
        <FeatureSwitches showAll={showAll} recovery={recovery} />
      </Panel>
    </>
  );
}
