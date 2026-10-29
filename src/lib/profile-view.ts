import "server-only";
import { toPublicProfile, validateUsername, type PublicProfile } from "@/lib/profile";
import { liveSnapshot } from "@/lib/profile-sync";
import { getProfile, getProfileByUsername, saveSnapshot } from "@/lib/repositories/profiles";

export type ProfileLookup =
  | { status: "ok"; view: PublicProfile }
  | { status: "not_found" }
  | { status: "unavailable" };

/**
 * The profile `viewerId` gets when they open `/u/<username>`. Your own profile is worked out live and shows every
 * section. Someone else's is read from the stored snapshot and cut down to what its owner shares. A private
 * profile and one that does not exist look exactly the same, so nobody can find out who has a private profile.
 */
export async function loadProfileView(viewerId: string, rawUsername: string): Promise<ProfileLookup> {
  const checked = validateUsername(rawUsername);
  if (!checked.ok) return { status: "not_found" };
  const username = checked.username;

  const mine = await getProfile(viewerId);
  if (!mine.available) return { status: "unavailable" };

  if (mine.profile && mine.profile.username === username) {
    const snapshot = await liveSnapshot(viewerId);
    // Looking at your own profile also brings the copy others read up to date.
    await saveSnapshot(viewerId, snapshot);
    return { status: "ok", view: toPublicProfile({ ...mine.profile, snapshot }, true)! };
  }

  const { profile } = await getProfileByUsername(username);
  const view = profile ? toPublicProfile(profile, false) : null;
  return view ? { status: "ok", view } : { status: "not_found" };
}
