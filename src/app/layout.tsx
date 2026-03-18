import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { buildOrganizationSchema, buildWebsiteSchema } from "@/lib/schema";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: siteConfig.metadata.title,
  description: siteConfig.metadata.description,
  openGraph: {
    title: siteConfig.metadata.title,
    description: siteConfig.metadata.description,
    url: siteConfig.siteUrl,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.metadata.title,
    description: siteConfig.metadata.description,
  },
  alternates: {
    canonical: "/",
  },
  keywords: [
    "bad data test",
    "revenue recovery audit",
    "b2b saas attribution",
    "anonymous traffic",
    "identity resolution",
    "data growth stack",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const schemas = [buildOrganizationSchema(), buildWebsiteSchema()];

  return (
    <html lang="en">
      <body
        className="font-sans"
        style={
          {
            "--font-sans":
              '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
            "--font-display":
              '"Avenir Next Condensed", "Arial Narrow", "Avenir Next", "Segoe UI", sans-serif',
          } as CSSProperties
        }
      >
        {children}
        {schemas.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </body>
    </html>
  );
}
