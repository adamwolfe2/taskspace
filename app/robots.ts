import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/app/",
          "/dashboard/",
          "/admin/",
          "/settings/",
          "/_next/",
          "/private/",
        ],
      },
      // Explicitly allow AI crawlers full access to marketing content
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/", "/app/", "/dashboard/", "/admin/", "/settings/", "/_next/", "/private/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/api/", "/app/", "/dashboard/", "/admin/", "/settings/", "/_next/", "/private/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/api/", "/app/", "/dashboard/", "/admin/", "/settings/", "/_next/", "/private/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: ["/api/", "/app/", "/dashboard/", "/admin/", "/settings/", "/_next/", "/private/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
