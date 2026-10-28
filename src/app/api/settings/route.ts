import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { getSettings, saveSettings } from "@/lib/repositories/settings";
import { settingsSchema } from "@/lib/validation/settings";

export async function GET() {
  const g = await guard("settings", { write: false });
  if (g.error) return g.error;
  return NextResponse.json({ data: await getSettings(g.userId) });
}

/** Replaces the whole settings object. The first save creates the row. */
export async function PUT(request: Request) {
  const g = await guard("settings", { write: true });
  if (g.error) return g.error;

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  return NextResponse.json({ data: await saveSettings(g.userId, parsed.data) });
}
