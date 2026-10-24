import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Data access layer helper for API routes. Re-verifies the session close to
 * the data, since proxy.ts only performs an optimistic check.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      user: null,
      supabase,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }
  return { user: data.user, supabase, error: null } as const;
}
