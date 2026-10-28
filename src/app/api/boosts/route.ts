import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { checkBoostDay } from "@/lib/boosters";
import { todayISO } from "@/lib/dates";
import { loadLevel } from "@/lib/level";
import { createBoost } from "@/lib/repositories/boosts";
import { boostSchema } from "@/lib/validation/boost";

/** Boosters earned, used and available, the welcome boost, and the days that are doubled. */
export async function GET() {
  const g = await guard("boosts", { write: false });
  if (g.error) return g.error;
  const { boosts } = await loadLevel(g.userId);
  return NextResponse.json({ data: boosts });
}

/** Uses one Double XP Day booster on `day` (today, or up to a week ahead). */
export async function POST(request: Request) {
  const g = await guard("boosts", { write: true, limit: 10 });
  if (g.error) return g.error;

  const parsed = boostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  const { day } = parsed.data;
  const today = todayISO();
  const when = checkBoostDay(day, today);
  if (when === "past") return badRequest("A booster cannot be used on a day that has passed.");
  if (when === "too_far") return badRequest("A booster can be used on today or up to a week ahead.");

  const { boosts } = await loadLevel(g.userId);
  const welcome = boosts.welcome;
  if (boosts.usedDays.includes(day) || (welcome && day >= welcome.start && day <= welcome.end)) {
    return NextResponse.json(
      { error: "That day is already doubled, so a booster would be wasted.", code: "already_boosted" },
      { status: 409 },
    );
  }
  if (boosts.available < 1) {
    return NextResponse.json({ error: "You have no boosters to use. Train to earn more.", code: "no_boosters" }, { status: 409 });
  }

  const result = await createBoost(g.userId, day);
  if (!result.ok) {
    return NextResponse.json({ error: "That day is already boosted.", code: "already_boosted" }, { status: 409 });
  }
  return NextResponse.json({ data: result.boost }, { status: 201 });
}
