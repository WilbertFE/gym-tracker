import { NextResponse } from "next/server";
import { guard } from "@/lib/api";
import { validateUsername } from "@/lib/profile";
import { usernameTaken } from "@/lib/repositories/profiles";

/**
 * Whether a username can be used, for the form to say so while you type. Rate limited, so it cannot be used
 * to list the usernames that exist.
 */
export async function GET(request: Request) {
  const g = await guard("profile-check", { write: true, limit: 20 });
  if (g.error) return g.error;

  const checked = validateUsername(new URL(request.url).searchParams.get("username"));
  if (!checked.ok) return NextResponse.json({ data: { available: false, message: checked.message } });
  const taken = await usernameTaken(checked.username, g.userId);
  return NextResponse.json({ data: { available: !taken, username: checked.username, message: taken ? "That username is taken." : null } });
}
