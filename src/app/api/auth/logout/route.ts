import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  if (isDemoMode()) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
