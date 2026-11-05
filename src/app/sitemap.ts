import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { articles } from "@/lib/articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: [string, number][] = [
    ["", 1],
    ["/services", 0.9],
    ["/services/dme", 0.9],
    ["/services/medical-billing", 0.9],
    ["/about", 0.7],
    ["/how-we-work", 0.7],
    ["/resources", 0.6],
    ["/contact", 0.8],
    ["/privacy-policy", 0.2],
    ["/terms", 0.2],
  ];
  return [
    ...pages.map(([p, priority]) => ({ url: `${site.url}${p}`, lastModified: now, priority })),
    // Only published articles are listed; draft samples are noindex.
    ...articles
      .filter((a) => a.status === "published")
      .map((a) => ({ url: `${site.url}/resources/${a.slug}`, lastModified: a.publishedAt ? new Date(a.publishedAt) : now, priority: 0.5 })),
  ];
}
