import { NextResponse, type NextRequest } from "next/server";
import { founderBriefMarkdown } from "./lib/living-corpus/founderBrief";

// Negotiate on an explicit media preference, never a bot's identity. Wildcard
// requests and browsers continue to receive the normal HTML experience.
export function proxy(request: NextRequest) {
  const types = (request.headers.get("accept") ?? "").split(",").map((part) => {
    const [type, ...params] = part.trim().toLowerCase().split(";");
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const quality = q ? Number(q.slice(2)) : 1;
    return { type, quality: Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0 };
  });
  const markdown = Math.max(0, ...types.filter((t) => t.type === "text/markdown").map((t) => t.quality));
  const html = Math.max(0, ...types.filter((t) => t.type === "text/html" || t.type === "application/xhtml+xml").map((t) => t.quality));
  const isNavigation = !request.headers.has("rsc") && !request.headers.has("next-router-state-tree");
  if ((request.method === "GET" || request.method === "HEAD") && isNavigation && markdown > html) {
    return new Response(request.method === "HEAD" ? null : founderBriefMarkdown(), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Vary": "Accept",
        "Cache-Control": "private, no-store",
        "Link": '</brief>; rel="alternate"; type="text/html", </llms.txt>; rel="describedby"',
      },
    });
  }
  const response = NextResponse.next();
  response.headers.append("Vary", "Accept");
  return response;
}

export const config = { matcher: ["/", "/about", "/brief"] };
