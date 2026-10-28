import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: [
        "/api/",
        "/dashboard/",
        "/workouts/",
        "/body/",
        "/membership/",
        "/schedule/",
        "/settings/",
        "/leaderboard/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
