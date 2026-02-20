import type { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/blog"

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
    "/features/tasks",
    "/features/communication",
    "/features/ai-agents",
    "/features/vto",
    "/solutions/leadership",
    "/solutions/sales",
    "/solutions/marketing",
    "/solutions/operations",
    "/integrations",
    "/pricing",
    "/about",
    "/contact",
    "/help",
    "/blog",
    "/terms",
    "/privacy",
  ]

  const staticSitemap: MetadataRoute.Sitemap = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : route === "/blog" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/features") ? 0.9 : route.startsWith("/solutions") ? 0.85 : route === "/blog" ? 0.8 : 0.7,
  }))

  // Blog posts
  const posts = getAllPosts()
  const blogSitemap: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date + "T12:00:00Z") : new Date(),
    changeFrequency: "monthly",
    priority: 0.75,
  }))

  return [...staticSitemap, ...blogSitemap]
}
