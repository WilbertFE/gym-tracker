import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

type PageMeta = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  index?: boolean;
};

/** Builds the full metadata object every page must export (see CLAUDE.md SEO rules). */
export function buildMetadata({
  title,
  description,
  path,
  keywords = ["gym tracker", "workout log"],
  index = false,
}: PageMeta): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary", title, description },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}
