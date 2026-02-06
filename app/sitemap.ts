import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://trytaskspace.com"

  // Static marketing pages
  const staticPages = [
    "",
    "/features",
    "/features/eod-reports",
    "/features/rocks",
    "/features/scorecard",
    "/features/level-10-meetings",
    "/features/ids-process",
    "/features/accountability-chart",
    "/features/team-management",
    "/features/analytics",
    "/solutions/leadership",
    "/solutions/sales",
    "/solutions/marketing",
    "/solutions/operations",
    "/integrations",
    "/pricing",
    "/about",
    "/contact",
    "/help",
  ]

  const staticSitemap: MetadataRoute.Sitemap = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/features") ? 0.9 : route.startsWith("/solutions") ? 0.85 : 0.8,
  }))

  return staticSitemap
}
