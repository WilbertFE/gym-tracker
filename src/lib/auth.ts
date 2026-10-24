import "server-only";
import { redirect } from "next/navigation";
import { connection, NextResponse } from "next/server";
import { DEMO_USER_ID, isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

/**
 * Data access layer helper for API routes. Re-verifies the session close to
 * the data, since proxy.ts only performs an optimistic check.
 */
export async function requireUser() {
  if (isDemoMode()) {
    return { user: { id: DEMO_USER_ID }, error: null } as const;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }
  return { user: { id: data.user.id }, error: null } as const;
}

/** For Server Components: the signed in user id, or a redirect to /login. */
export async function getCurrentUserId(): Promise<string> {
  await connection();
  if (isDemoMode()) return DEMO_USER_ID;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user.id;
}
