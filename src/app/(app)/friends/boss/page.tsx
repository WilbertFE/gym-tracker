import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The fights moved to the Battle page. The old address keeps working, so bookmarks and links do not break. */
export default function Page() {
  redirect("/battle?tab=friends");
}
