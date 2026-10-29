import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { chestKind, rollChest, secureRandom } from "@/lib/chests";
import { todayISO } from "@/lib/dates";
import { GRADES } from "@/lib/items";
import { loadLevel } from "@/lib/level";
import { recordOpening } from "@/lib/repositories/chests";
import { openChestSchema } from "@/lib/validation/chest";

/**
 * Opens one chest. Nothing from the request decides what is inside: the server works out again that the chest
 * was earned, is still open and has not been opened, rolls with its own random source and stores the result.
 * The chest id is the primary key of the stored row, so a chest cannot be opened twice, even in a race.
 */
export async function POST(request: Request) {
  const g = await guard("chests-open", { write: true, limit: 10 });
  if (g.error) return g.error;

  const parsed = openChestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();
  const { chestId } = parsed.data;

  const { chests, collection } = await loadLevel(g.userId);
  if (!chests.enabled) {
    return NextResponse.json({ error: "Chests are not set up yet.", code: "unavailable" }, { status: 503 });
  }
  if (chests.openings.some((o) => o.chest_id === chestId)) {
    return NextResponse.json({ error: "That chest is already open.", code: "already_opened" }, { status: 409 });
  }
  if (chests.expired.some((c) => c.id === chestId)) {
    return NextResponse.json({ error: "That chest ran out. Chests can be opened for a limited time.", code: "expired" }, { status: 410 });
  }
  const chest = chests.available.find((c) => c.id === chestId);
  if (!chest) return badRequest("You have not earned that chest.");

  const roll = rollChest({
    kind: chestKind(chest.id),
    owned: new Set(collection.owned),
    history: chests.openings,
    rng: secureRandom,
  });

  const result = await recordOpening(g.userId, {
    chest_id: chest.id,
    item_id: roll.item.id,
    grade: roll.grade,
    duplicate: roll.duplicate,
    bonus_xp: roll.bonusXp,
    opened_on: todayISO(),
  });
  if (!result.ok) {
    return result.reason === "already_opened"
      ? NextResponse.json({ error: "That chest is already open.", code: "already_opened" }, { status: 409 })
      : NextResponse.json({ error: "Chests are not set up yet.", code: "unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    {
      data: {
        chestId: chest.id,
        kind: chest.kind,
        item: roll.item,
        grade: roll.grade,
        gradeName: GRADES[roll.grade].name,
        duplicate: roll.duplicate,
        bonusXp: roll.bonusXp,
        /** Chests still waiting after this one. */
        remaining: chests.available.length - 1,
      },
    },
    { status: 201 },
  );
}
