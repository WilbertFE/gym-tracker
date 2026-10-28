import { format, parseISO } from "date-fns";
import Link from "next/link";
import { Panel } from "@/components/panel";
import { LockedFeature } from "@/components/locked-feature";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { isUnlocked } from "@/lib/unlocks";
import { getShowAll } from "@/lib/unlock-state";
import { weekEnd, isBoardPeriod, isBoardScope } from "@/lib/leaderboard";
import { buildBoard } from "@/lib/leaderboard-board";
import { syncLeaderboardEntry } from "@/lib/leaderboard-sync";
import { getEntry } from "@/lib/repositories/leaderboard";
import { BoardControls } from "./board-controls";
import { BoardList } from "./board-list";
import { JoinCard } from "./join-card";

export async function LeaderboardView({ scope: rawScope, period: rawPeriod }: { scope?: string; period?: string }) {
  const userId = await getCurrentUserId();
  const [{ level }, showAll] = await Promise.all([loadLevel(userId), getShowAll()]);
  if (!isUnlocked("leaderboard", level.level, showAll)) {
    return <LockedFeature id="leaderboard" level={level.level} totalXp={level.total} />;
  }
  const scope = isBoardScope(rawScope) ? rawScope : "global";
  const period = isBoardPeriod(rawPeriod) ? rawPeriod : "all";

  // Bring your own score up to date before it is read, so you never see yourself behind.
  if (await getEntry(userId)) await syncLeaderboardEntry(userId);
  const board = await buildBoard(userId, scope, period);

  return (
    <div className="flex flex-col gap-6">
      <JoinCard joined={board.joined} displayName={board.displayName} />

      <BoardControls scope={scope} period={period} />

      {board.problem === "no_country" ? (
        <Panel label="My country">
          <p className="text-sm text-muted-foreground">
            Choose your country in{" "}
            <Link href="/settings" className="underline underline-offset-4">
              Settings
            </Link>{" "}
            to see who is ahead of you at home.
          </p>
        </Panel>
      ) : (
        <BoardList
          rows={board.rows}
          me={board.me}
          joined={board.joined}
          label={`${scope === "global" ? "Worldwide" : "Your country"}, ${period === "week" ? "this week" : "all time"}`}
          note={
            period === "week"
              ? `Week of ${format(parseISO(board.weekStart), "d MMM")} to ${format(parseISO(weekEnd(board.weekStart)), "d MMM")}. It starts again every Monday.`
              : "XP earned since you started."
          }
        />
      )}
    </div>
  );
}
