import { format, parseISO } from "date-fns";
import { Panel } from "@/components/panel";
import { BOOSTER_RULES, BOOST_MULTIPLIER, WELCOME_BOOST_DAYS, type BoostSummary } from "@/lib/boosters";
import { addDaysISO } from "@/lib/week";
import { UseBoosterButton } from "./use-booster-button";

const day = (iso: string) => format(parseISO(iso), "EEE d MMM");

/** Why a booster cannot go on a day, or null when it can. */
function blockedReason(iso: string, boosts: BoostSummary): string | null {
  const welcome = boosts.welcome;
  if (welcome && iso >= welcome.start && iso <= welcome.end) return "Already doubled by the welcome boost.";
  if (boosts.usedDays.includes(iso)) return "Already doubled by a booster.";
  if (boosts.available < 1) return "No boosters left.";
  return null;
}

export function BoostersPanel({ boosts, today }: { boosts: BoostSummary; today: string }) {
  const tomorrow = addDaysISO(today, 1);
  const welcome = boosts.welcome;
  const upcoming = boosts.usedDays.filter((d) => d >= today);
  const past = boosts.usedDays.filter((d) => d < today);

  return (
    <Panel label="Boosters">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-4">
          {[
            ["Ready", boosts.available],
            ["Earned", boosts.earned],
            ["Used", boosts.used],
          ].map(([name, value]) => (
            <div key={name} className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{name}</span>
              <span className="tabular text-4xl font-medium leading-none">{value}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          A Double XP Day booster doubles all the XP you earn on one day. Pick the day, and everything you log that day
          counts x{BOOST_MULTIPLIER}. Boosters do not stack with the welcome boost.
        </p>

        {welcome && (
          <p className="border-l-2 border-primary pl-3 text-sm">
            {welcome.active ? (
              <>
                Welcome boost: x{BOOST_MULTIPLIER} XP until {day(welcome.end)}, {welcome.daysLeft} day
                {welcome.daysLeft === 1 ? "" : "s"} left.
              </>
            ) : (
              <span className="text-muted-foreground">
                Welcome boost ended on {day(welcome.end)}. It covers your first {WELCOME_BOOST_DAYS} days.
              </span>
            )}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <UseBoosterButton day={today} label="Use a booster today" blockedReason={blockedReason(today, boosts)} />
          <UseBoosterButton
            day={tomorrow}
            label={`Use one tomorrow (${day(tomorrow)})`}
            blockedReason={blockedReason(tomorrow, boosts)}
          />
        </div>

        {(upcoming.length > 0 || past.length > 0) && (
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Boosted days</span>
            <ul className="flex flex-wrap gap-2">
              {[...past.slice(-5), ...upcoming].map((d) => (
                <li key={d} className="tabular border px-2 py-1 text-xs">
                  {day(d)}
                  {d === today ? " (today)" : d > today ? " (coming)" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-1 text-sm">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">How to earn boosters</span>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
            <li>{BOOSTER_RULES.firstWorkout} for your first finished workout</li>
            <li>1 more for every {BOOSTER_RULES.perWorkouts} finished workouts</li>
            {BOOSTER_RULES.streaks.map(([days, count]) => (
              <li key={days}>
                {count} for a {days} day streak
              </li>
            ))}
          </ul>
          {boosts.sources.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Earned so far: {boosts.sources.map((s) => `${s.label} (${s.count})`).join(", ")}.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
