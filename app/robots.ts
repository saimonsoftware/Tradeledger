import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // The logged-in app and auth callbacks have nothing useful for search engines.
    rules: { userAgent: "*", allow: "/", disallow: ["/app/", "/auth/"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
