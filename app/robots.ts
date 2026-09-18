import type { MetadataRoute } from "next";
import { canonicalOrigin } from "@/lib/origin";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/card", "/resume"],
      disallow: ["/admin", "/api/", "/design-lab", "/wallet-assets", "/qr"],
    },
    sitemap: `${canonicalOrigin()}/sitemap.xml`,
  };
}
