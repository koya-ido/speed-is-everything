import { routing } from "@/i18n/routing";
import { MetadataRoute } from "next";

const host =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export default function sitemap(): MetadataRoute.Sitemap {
  const defaultLocale = routing.defaultLocale;
  const locales = routing.locales;

  // Define routes that should be indexed
  const routes = ["", "/game", "/ranking", "/terms", "/privacy"];

  const sitemapEntries = routes.map((route) => {
    const alternates: { languages: Record<string, string> } = {
      languages: {},
    };

    locales.forEach((locale) => {
      alternates.languages[locale] = `${host}/${locale}${route}`;
    });

    return {
      url: `${host}/${defaultLocale}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.8,
      alternates,
    };
  });

  return sitemapEntries;
}
