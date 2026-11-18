import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/signup", "/login", "/privacy", "/terms"].map((path) => ({
    url: `${siteConfig.url}${path}`,
  }));
}
