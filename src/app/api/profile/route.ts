import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { syncLeaderboardEntry } from "@/lib/leaderboard-sync";
import { parseSections, validateBio, validateProfileName, validateUsername, type Profile } from "@/lib/profile";
import { syncProfileSnapshot } from "@/lib/profile-sync";
import { getEntry } from "@/lib/repositories/leaderboard";
import { deleteProfile, displayNameTaken, getProfile, saveProfile, usernameTaken } from "@/lib/repositories/profiles";
import { profileSchema } from "@/lib/validation/profile";

/** The profile as its owner edits it. The snapshot is left out: it is derived, and the browser has no use for it. */
const editable = (p: Profile) => ({
  username: p.username,
  display_name: p.display_name,
  bio: p.bio,
  visibility: p.visibility,
  sections: p.sections,
});

const unavailable = () => NextResponse.json({ error: "Profiles are not set up yet.", code: "unavailable" }, { status: 503 });

/** Your own profile, or null, and a name to start from when you are already on the leaderboard. */
export async function GET() {
  const g = await guard("profile", { write: false });
  if (g.error) return g.error;
  const [{ available, profile }, entry] = await Promise.all([getProfile(g.userId), getEntry(g.userId)]);
  return NextResponse.json({ data: { available, profile: profile ? editable(profile) : null, suggestedName: entry?.display_name ?? null } });
}

/**
 * Creates your profile or changes it. Every part is checked here, the username and the display name must be free,
 * and the public snapshot is worked out by the server from your own data, never taken from the request.
 */
export async function PUT(request: Request) {
  const g = await guard("profile", { write: true, limit: 10 });
  if (g.error) return g.error;

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  const username = validateUsername(parsed.data.username);
  if (!username.ok) return badRequest(username.message);
  const name = validateProfileName(parsed.data.display_name);
  if (!name.ok) return badRequest(name.message);
  const bio = validateBio(parsed.data.bio ?? null);
  if (!bio.ok) return badRequest(bio.message);

  const { available } = await getProfile(g.userId);
  if (!available) return unavailable();

  if (await usernameTaken(username.username, g.userId)) {
    return NextResponse.json({ error: "That username is taken. Pick another.", code: "username_taken" }, { status: 409 });
  }
  if (await displayNameTaken(name.name, g.userId)) {
    return NextResponse.json({ error: "That display name is taken. Pick another.", code: "name_taken" }, { status: 409 });
  }

  const saved = await saveProfile(g.userId, {
    username: username.username,
    display_name: name.name,
    bio: bio.bio,
    visibility: parsed.data.visibility,
    sections: parseSections(parsed.data.sections),
  });
  if (!saved.ok) {
    if (saved.reason === "unavailable") return unavailable();
    return NextResponse.json(
      { error: saved.reason === "name_taken" ? "That display name is taken. Pick another." : "That username is taken. Pick another.", code: saved.reason },
      { status: 409 },
    );
  }

  // The snapshot others read, and the leaderboard row (it shows the same display name), follow right away.
  await syncProfileSnapshot(g.userId);
  await syncLeaderboardEntry(g.userId);
  return NextResponse.json({ data: editable(saved.profile) });
}

/** Deletes your profile. The leaderboard keeps the name you have there. */
export async function DELETE() {
  const g = await guard("profile", { write: true, limit: 10 });
  if (g.error) return g.error;
  await deleteProfile(g.userId);
  return NextResponse.json({ data: { deleted: true } });
}
