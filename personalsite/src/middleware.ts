import { NextResponse, type NextRequest } from "next/server";

// The home page is a client-rendered chat UI, so an agent that fetches it gets
// a shell and no content. When the requester is a program rather than a
// browser, serve the markdown index instead.
//
// Search engines and social preview crawlers are deliberately excluded: they
// need the real HTML, and serving them something different from what a browser
// sees is cloaking.
const HTML_UA =
  /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|twitterbot|facebookexternalhit|slackbot|discordbot|linkedinbot|whatsapp|telegrambot|embedly|quora link preview|pinterest|redditbot|vercel|headlesschrome|lighthouse|pagespeed)/i;

// Agents that announce themselves. Most would be caught by the Accept check
// below anyway; this is here so a crawler that sends a browser-shaped Accept
// still gets the index.
const AGENT_UA =
  /(claudebot|claude-web|claude-user|anthropic-ai|gptbot|chatgpt-user|oai-searchbot|perplexitybot|perplexity-user|youbot|cohere-ai|ccbot|applebot-extended|meta-externalagent|bytespider|diffbot|amazonbot|google-extended|duckassistbot|mistralai-user)/i;

// A browser navigating to a page always lists text/html in Accept. A script
// calling fetch() sends */* (node, undici, requests, curl), an explicit
// text/markdown, or nothing at all.
function wantsHtml(accept: string): boolean {
  return /\b(text\/html|application\/xhtml\+xml)\b/i.test(accept);
}

export function middleware(request: NextRequest) {
  const headers = request.headers;
  const ua = headers.get("user-agent") ?? "";

  if (HTML_UA.test(ua)) return NextResponse.next();

  const isAgentUa = AGENT_UA.test(ua);

  // Every current browser stamps Sec-Fetch-Site and Sec-Fetch-Dest on both
  // navigations and fetch(). This is what keeps Next's own client router
  // working: an RSC prefetch of "/" arrives with Sec-Fetch-Site: same-origin,
  // and rewriting it to /llms.txt would break navigating home. (The RSC and
  // Next-Router-Prefetch headers are stripped before middleware sees them, so
  // they cannot be used for this.)
  //
  // Sec-Fetch-Mode is deliberately not in this list: node's undici sends
  // `sec-fetch-mode: cors` on a bare fetch() but neither of the other two, so
  // including it would misread every Node-based agent as a browser.
  if (!isAgentUa && (headers.has("sec-fetch-site") || headers.has("sec-fetch-dest"))) {
    return NextResponse.next();
  }

  // A shared chat link (/?q=...) has its own generated metadata worth serving.
  if (request.nextUrl.searchParams.has("q")) return NextResponse.next();

  if (!isAgentUa && wantsHtml(headers.get("accept") ?? "")) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/llms.txt";
  const response = NextResponse.rewrite(url);
  // Tell caches this URL varies by requester so a browser never gets a cached
  // copy of the markdown, or the reverse.
  response.headers.set("Vary", "User-Agent, Accept, Sec-Fetch-Site, Sec-Fetch-Dest");
  response.headers.set("X-Agent-Index", "rewritten-from-root");
  return response;
}

export const config = {
  // Bare "/" only. Every other route already renders its content server-side.
  matcher: ["/"],
};
