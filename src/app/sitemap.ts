import type { MetadataRoute } from "next";
import { MENTORS } from "@/data/mentors";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://chronocoder-1.onrender.com";

/**
 * Sitemap for search engines (#200).
 *
 * Includes the landing page and every mentor workspace. Workspaces are
 * client-rendered, but the URLs are still valid, crawlable routes.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  const mentorEntries: MetadataRoute.Sitemap = MENTORS.map((mentor) => ({
    url: `${BASE_URL}/workspace/${mentor.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...mentorEntries];
}