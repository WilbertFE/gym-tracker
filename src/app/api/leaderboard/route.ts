import { NextResponse } from "next/server";
import { guard } from "@/lib/api";
import { isBoardPeriod, isBoardScope } from "@/lib/leaderboard";
import { buildBoard } from "@/lib/leaderboard-board";
import { syncLeaderboardEntry } from "@/lib/leaderboard-sync";

/**
 * One board view: `?scope=global|country&period=all|week`. Returns the top rows and your own position.
 * Rows carry no user ids, only the nickname, country, level and XP that everyone may see.
 */
export async function GET(request: Request) {
  const g = await guard("leaderboard", { write: false });
  if (g.error) return g.error;

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "global";
  const period = url.searchParams.get("period") ?? "all";
  if (!isBoardScope(scope) || !isBoardPeriod(period)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const board = await buildBoard(g.userId, scope, period);
  if (board.problem === "no_country") {
    return NextResponse.json(
      { error: "Set your country in Settings to see your country board.", code: "no_country" },
      { status: 400 },
    );
  }
  // Your own score is brought up to date before it is read, so it is never behind.
  if (board.joined && (await syncLeaderboardEntry(g.userId))) {
    return NextResponse.json({ data: await buildBoard(g.userId, scope, period) });
  }
  return NextResponse.json({ data: board });
}
