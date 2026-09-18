import type { MetadataRoute } from "next";
import { canonicalOrigin } from "@/lib/origin";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/card", "/resume"].map((route) => ({
    url: `${canonicalOrigin()}${route}`,
  }));
}
