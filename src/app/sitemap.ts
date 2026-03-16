import type { MetadataRoute } from "next";
import { articles } from "@/config/articles";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.siteUrl,
      lastModified: new Date(),
    },
    {
      url: `${siteConfig.siteUrl}/insights`,
      lastModified: new Date(),
    },
    ...articles.map((article) => ({
      url: `${siteConfig.siteUrl}/insights/${article.slug}`,
      lastModified: new Date(),
    })),
  ];
}
