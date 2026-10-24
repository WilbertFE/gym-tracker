import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "signup"), 3, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password format" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    return NextResponse.json({ error: "Could not create account" }, { status: 400 });
  }
  // With email confirmation on, there is no session until the link is opened.
  return NextResponse.json({ ok: true, needsConfirmation: !data.session });
}
