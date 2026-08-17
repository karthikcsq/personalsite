import { Suspense } from "react";
import type { Metadata } from "next";
import HomeChatClient from "@/app/HomeChatClient";
import { buildLlmsIndex } from "@/utils/llmsIndex";

// Only `</script` can terminate the block early; the rest of the markdown is
// inert inside an unhandled script type and must survive byte-for-byte so an
// agent reading it gets valid markdown.
function escapeForScript(s: string): string {
  return s.replace(/<\/(script)/gi, "<\\/$1");
}

// Cap the prompt length for metadata + image so a crafted URL can't blow
// up the title or break the OG renderer's layout. Browsers truncate well
// past this in the address bar anyway.
const MAX_PROMPT = 200;

function readPromptParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, MAX_PROMPT);
  return trimmed.length > 0 ? trimmed : null;
}

// Dynamic preview metadata for shared deep links like /?q=tell+me+about+X.
// When `q` is present, the link card (iMessage, Slack, Discord, X, LinkedIn)
// shows the prompt as the title and renders a chat-bubble OG image via
// /api/og. Without `q`, the root layout's static metadata takes over and
// the auto-discovered opengraph-image.tsx is used.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const prompt = readPromptParam(params.q);
  if (!prompt) return {};

  const title = `Ask Karthik: “${prompt}”`;
  const description = `Ask the site anything. This link opens the chat with: “${prompt}”.`;
  const ogImage = `/api/og?q=${encodeURIComponent(prompt)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: prompt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

const SITE = "https://www.karthikthyagarajan.com";

// Sitewide identity graph. Lives on the home page rather than the root
// layout so it is declared exactly once per crawl rather than on every
// route. Links out to the sections a crawler should follow.
const identityJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE}/#person`,
      name: "Karthik Thyagarajan",
      url: SITE,
      jobTitle: "Founder-engineer",
      alumniOf: { "@type": "CollegeOrUniversity", name: "Purdue University" },
      knowsAbout: [
        "AI agents",
        "Machine learning",
        "On-device AI",
        "Robotics",
        "Computer vision",
        "Quantum key distribution",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: "Karthik Thyagarajan",
      publisher: { "@id": `${SITE}/#person` },
      inLanguage: "en",
    },
  ],
};

// HomeChatClient calls useSearchParams() for the ?q auto-submit, which
// forces a CSR bail-out and must live under a Suspense boundary.
export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(identityJsonLd) }}
      />
      {/* The full site index, inline. Middleware already swaps this page for
          /llms.txt when the requester identifies as an agent, but plenty of
          fetchers send a browser user-agent and get the HTML. A script block
          of an unhandled MIME type is never parsed, executed, rendered, or
          read aloud, so this costs a human reader nothing while putting the
          whole inventory in the raw response of a bare fetch("/"). */}
      <script
        type="text/markdown"
        id="site-index"
        data-canonical="/llms.txt"
        dangerouslySetInnerHTML={{ __html: escapeForScript(buildLlmsIndex()) }}
      />
      {/* Crawlable path into the rest of the site. The chat UI is the whole
          home page, so without this the only outbound links are client-side
          and a crawler that does not run the hero rail sees a dead end. */}
      <nav aria-label="Sections" className="sr-only">
        <a href="/work">Work</a>
        <a href="/projects">Projects</a>
        <a href="/involvement">Involvement</a>
        <a href="/notes">Notes</a>
        <a href="/blog">Writing</a>
        <a href="/gallery">Photography</a>
        <a href="/about">About</a>
      </nav>
      <Suspense fallback={null}>
        <HomeChatClient />
      </Suspense>
    </>
  );
}
