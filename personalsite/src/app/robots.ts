import type { MetadataRoute } from "next";

const SITE = "https://www.karthikthyagarajan.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /api/* is chat and gallery data, not content. /a2ui-draft is a
        // scratch page. Neither should burn crawl budget.
        disallow: ["/api/", "/a2ui-draft"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
