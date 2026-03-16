import { siteConfig } from "@/config/site";

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.siteUrl,
    description: siteConfig.metadata.description,
  };
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
