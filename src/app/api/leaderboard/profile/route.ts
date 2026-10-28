import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { validateDisplayName } from "@/lib/leaderboard";
import { writeEntry } from "@/lib/leaderboard-sync";
import { deleteEntry } from "@/lib/repositories/leaderboard";

/**
 * Joins the leaderboard, or changes the nickname if already joined. The body holds only the nickname:
 * the score is worked out here, from the user's own data, never taken from the request.
 */
export async function PUT(request: Request) {
  const g = await guard("leaderboard-profile", { write: true, limit: 10 });
  if (g.error) return g.error;

  const body = (await request.json().catch(() => null)) as { display_name?: unknown } | null;
  const name = validateDisplayName(body?.display_name);
  if (!name.ok) return badRequest(name.message);

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
