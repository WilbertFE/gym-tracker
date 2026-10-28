import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { XP_SOURCE_HINTS } from "@/lib/xp";

export async function LevelDetail() {
  const userId = await getCurrentUserId();
  const { xp, level } = await loadLevel(userId);
  const percent = Math.round(level.progress * 100);

  return (
    <div className="flex flex-col gap-6">
      <Panel label="Your level">
        <div className="flex flex-col gap-4">
          <p className="tabular text-6xl font-medium leading-none">
            {level.level}
            <span className="ml-3 text-lg text-muted-foreground">{level.title}</span>
          </p>
          <div
            role="progressbar"
            aria-label={`Progress to level ${level.level + 1}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 w-full bg-intensity-none"
          >
            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <p className="tabular text-sm text-muted-foreground">
            {level.intoLevel} / {level.levelSpan} XP in this level, {level.toNext} to go. {level.total.toLocaleString("en-US")} XP in
            total.
          </p>
        </div>
      </Panel>

      <Panel label="Where your XP comes from">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
              <th scope="col" className="pb-2 font-normal">Source</th>
              <th scope="col" className="pb-2 text-right font-normal">Count</th>
              <th scope="col" className="pb-2 text-right font-normal">XP</th>
            </tr>
          </thead>
          <tbody>
            {xp.lines.map((line) => (
              <tr key={line.source} className="border-t align-top">
                <th scope="row" className="py-3 pr-3 text-left font-normal">
                  {line.label}
                  <span className="mt-1 block text-xs text-muted-foreground">{XP_SOURCE_HINTS[line.source]}</span>
                </th>
                <td className="tabular py-3 text-right">{line.count}</td>
                <td className="tabular py-3 text-right">{line.xp}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <th scope="row" className="py-3 text-left font-medium">Total</th>
              <td />
              <td className="tabular py-3 text-right font-medium">{xp.total}</td>
            </tr>
          </tfoot>
        </table>
      </Panel>

      <Panel label="Levels">
        <p className="text-sm text-muted-foreground">
          Each level takes more XP than the last: level 2 at 100 XP, level 3 at 300, level 4 at 600, level 5 at 1,000.
          Your title changes at levels 5, 10, 15, 20 and 30. Rankings against other people, by country and worldwide,
          are planned for later.
        </p>
      </Panel>
    </div>
  );
}
