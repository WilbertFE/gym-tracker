import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Only public, indexable routes. Authenticated pages are disallowed in robots.ts. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
