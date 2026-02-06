import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://align.app"

  // Static marketing pages
  const staticPages = [
    "",
    "/features",
    "/features/eod-reports",
    "/features/team-management",
    "/features/analytics",
    "/features/rocks",
    "/features/calendar",
    "/pricing",
    "/about",
    "/contact",
    "/resources",
    "/help",
    "/login",
    "/register",
    "/privacy",
    "/terms",
  ]

  const staticSitemap: MetadataRoute.Sitemap = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/features") ? 0.9 : 0.8,
  }))

  // Help center categories
  const helpCategories = [
    "getting-started",
    "eod-reports",
    "team-management",
    "rocks-goals",
    "analytics",
    "account",
    "billing",
    "security",
  ]

  const helpSitemap: MetadataRoute.Sitemap = helpCategories.map((category) => ({
    url: `${baseUrl}/help/${category}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  return [...staticSitemap, ...helpSitemap]
}
