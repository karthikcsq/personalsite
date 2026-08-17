// Hand-written rather than the Metadata API's robots.ts, because the LLM
// index pointers below are not fields MetadataRoute.Robots can express.
export const dynamic = "force-static";

const SITE = "https://www.karthikthyagarajan.com";

const body = `User-agent: *
Allow: /
# /api/* is chat and gallery data, not content. /a2ui-draft is a scratch page.
# Neither should burn crawl budget.
Disallow: /api/
Disallow: /a2ui-draft

Sitemap: ${SITE}/sitemap.xml
Host: ${SITE}

# Machine-readable index of every project, job, involvement, note, and post.
# llms-full.txt additionally inlines the full text of every note.
LLM-Index: ${SITE}/llms.txt
LLM-Full: ${SITE}/llms-full.txt
`;

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
