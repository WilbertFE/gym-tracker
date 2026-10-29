import { NextResponse } from "next/server";
import { guard } from "@/lib/api";
import { loadLevel } from "@/lib/level";

/** The chests waiting to be opened, how many ran out, what was opened and the items owned and worn. */
export async function GET() {
  const g = await guard("chests", { write: false });
  if (g.error) return g.error;
  const { chests, collection } = await loadLevel(g.userId);
  return NextResponse.json({
    data: {
      enabled: chests.enabled,
      available: chests.available,
      expired: chests.expired.length,
      openings: chests.openings,
      collection,
    },
  });
}
