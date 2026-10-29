import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { validateDisplayName } from "@/lib/leaderboard";
import { writeEntry } from "@/lib/leaderboard-sync";
import { deleteEntry } from "@/lib/repositories/leaderboard";
import { displayNameTaken, getProfile } from "@/lib/repositories/profiles";

/**
 * Joins the leaderboard, or changes the nickname if already joined. The body holds only the nickname:
 * the score is worked out here, from the user's own data, never taken from the request.
 */
export async function PUT(request: Request) {
  const g = await guard("leaderboard-profile", { write: true, limit: 10 });
  if (g.error) return g.error;

  const body = (await request.json().catch(() => null)) as { display_name?: unknown } | null;
  // With a profile there is one display name for everything, set in Settings, so the request's nickname is ignored.
  const { profile } = await getProfile(g.userId);
  const name = validateDisplayName(profile?.display_name ?? body?.display_name);
  if (!name.ok) return badRequest(name.message);
  if (await displayNameTaken(name.name, g.userId)) {
    return NextResponse.json({ error: "That nickname is taken. Pick another.", code: "name_taken" }, { status: 409 });
  }

  const result = await writeEntry(g.userId, name.name);
  if (!result.ok) {
    return NextResponse.json({ error: "That nickname is taken. Pick another.", code: "name_taken" }, { status: 409 });
  }
  return NextResponse.json({ data: { display_name: result.entry.display_name } });
}

/** Leaves the leaderboard. The row is deleted. */
export async function DELETE() {
  const g = await guard("leaderboard-profile", { write: true, limit: 10 });
  if (g.error) return g.error;
  await deleteEntry(g.userId);
  return NextResponse.json({ data: { left: true } });
}
