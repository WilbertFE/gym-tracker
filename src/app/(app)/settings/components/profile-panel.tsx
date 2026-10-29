import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { getEntry } from "@/lib/repositories/leaderboard";
import { getProfile } from "@/lib/repositories/profiles";
import { ProfileForm } from "./profile-form";

/** The profile section of Settings: who can open your profile and what it shows. */
export async function ProfilePanel() {
  const userId = await getCurrentUserId();
  const [{ available, profile }, entry] = await Promise.all([getProfile(userId), getEntry(userId)]);

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
