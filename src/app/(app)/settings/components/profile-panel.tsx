import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { featureById, isUnlocked } from "@/lib/unlocks";
import { getShowAll } from "@/lib/unlock-state";
import { getEntry } from "@/lib/repositories/leaderboard";
import { getProfile } from "@/lib/repositories/profiles";
import { ProfileForm } from "./profile-form";

/** The profile section of Settings: who can open your profile and what it shows. */
export async function ProfilePanel() {
  const userId = await getCurrentUserId();
  const [{ available, profile }, entry, { level }, showAll] = await Promise.all([getProfile(userId), getEntry(userId), loadLevel(userId), getShowAll()]);

  if (!isUnlocked("profile", level.level, showAll)) {
    return (
      <section id="profile" aria-label="Profile" className="scroll-mt-6">
        <Panel label="Profile" variant="plain">
          <p className="text-sm text-muted-foreground">
            Your player page opens at level {featureById("profile").level}. You are level {level.level}, so keep training.
          </p>
        </Panel>
      </section>
    );
  }

  return (
    <section id="profile" aria-label="Profile" className="scroll-mt-6">
      <Panel label="Profile" variant="system">
        <ProfileForm
          available={available}
          initial={
            profile
              ? { username: profile.username, display_name: profile.display_name, bio: profile.bio, visibility: profile.visibility, sections: profile.sections }
              : null
          }
          suggestedName={entry?.display_name ?? null}
        />
      </Panel>
    </section>
  );
}
