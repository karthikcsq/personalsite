import LivingCorpusClient from "@/app/living-corpus-draft/LivingCorpusClient";
import CorpusPageTransition from "@/app/components/CorpusPageTransition";
import { buildMinimalCorpusItems } from "@/lib/living-corpus/minimalHomepage";
import { MINIMAL_CATEGORIES } from "@/lib/living-corpus/minimalTypes";
import { buildLlmsIndex } from "@/utils/llmsIndex";

// Only `</script` can terminate the block early; the rest of the markdown is
// inert inside an unhandled script type and must survive byte-for-byte so an
// agent reading it gets valid markdown.
function escapeForScript(s: string): string {
  return s.replace(/<\/(script)/gi, "<\\/$1");
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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[]; item?: string | string[] }>;
}) {
  const params = await searchParams;
  const sectionParam = params.section;
  const itemParam = Array.isArray(params.item) ? params.item[0] : params.item;
  const items = buildMinimalCorpusItems();
  const initialItem = items.find((item) => item.id === itemParam) ?? null;
  const requestedSection = Array.isArray(sectionParam) ? sectionParam[0] : sectionParam;
  const initialSection = initialItem?.category ?? MINIMAL_CATEGORIES.find(
    ({ id }) => id === (requestedSection === "ideas" ? "writing" : requestedSection),
  )?.id ?? null;

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
      {/* Crawlable path into the rest of the site for agents that do not
          execute the client-side living corpus. */}
      <nav aria-label="Sections" className="sr-only">
        <a href="/?section=work">Work</a>
        <a href="/?section=projects">Projects</a>
        <a href="/?section=involvement">Involvement</a>
        <a href="/?section=writing">Writing</a>
        <a href="/gallery">Photography</a>
        <a href="/about">About</a>
      </nav>
      <CorpusPageTransition page="home">
        <LivingCorpusClient key={initialItem?.id ?? initialSection ?? "home"} items={items} initialSection={initialSection} initialItemId={initialItem?.id} />
      </CorpusPageTransition>
    </>
  );
}
