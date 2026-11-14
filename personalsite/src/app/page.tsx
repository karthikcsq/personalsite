import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { getSiteData } from "@/app/_home/_data/siteData";
import type { ExhibitEntry } from "@/app/_home/exhibit/types";
import { PLAN } from "@/app/_home/oneLiners";
import { display, mono } from "@/app/_home/fonts";
import Monolith from "@/app/_home/monolith/Monolith";
import ms from "@/app/_home/monolith/monolith.module.css";
import PageTransition from "@/app/_home/PageTransition";
import { founderBrief } from "@/lib/living-corpus/founderBrief";
import { buildLlmsIndex } from "@/utils/llmsIndex";

// His "What I'm looking for" note, split into its sections, verbatim.
function interestSections(): Record<string, string[]> {
  const candidates = [
    path.join(process.cwd(), "..", "python-rag", "rag-docs", "corpus", "topic_what-im-looking-for.md"),
    path.join(process.cwd(), "python-rag", "rag-docs", "corpus", "topic_what-im-looking-for.md"),
  ];
  const file = candidates.find((f) => fs.existsSync(f));
  if (!file) return {};
  const body = fs.readFileSync(file, "utf8").replace(/^---[\s\S]*?---\n/, "");
  const out: Record<string, string[]> = {};
  let key = "";
  for (const block of body.split(/\n\s*\n/)) {
    const h = /^##\s+(.+)$/m.exec(block.trim());
    if (h) {
      key = h[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      out[key] = [];
      continue;
    }
    const b = block.trim();
    if (!key || !b) continue;
    // keep list blocks line by line; join wrapped lines of ordinary paragraphs
    out[key].push(/^\s*- /m.test(b) ? b : b.replace(/\s*\n\s*/g, " "));
  }
  return out;
}

export const metadata: Metadata = { alternates: { canonical: "/" } };

const SITE = "https://www.karthikthyagarajan.com";

// Only `</script` can end the block early; the markdown inside must survive byte for byte.
const escapeForScript = (s: string) => s.replace(/<\/(script)/gi, "<\\/$1");

// Sitewide identity graph, declared once, on the home page.
const identityJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE}/#person`,
      name: "Karthik Thyagarajan",
      url: SITE,
      jobTitle: "Founder-engineer",
      description: founderBrief.summary,
      sameAs: ["https://github.com/karthikcsq", "https://www.linkedin.com/in/karthikthyagarajan06"],
      alumniOf: { "@type": "CollegeOrUniversity", name: "Purdue University" },
      knowsAbout: ["AI agents", "Machine learning", "On-device AI", "Robotics", "Computer vision", "Quantum key distribution"],
    },
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "Karthik Thyagarajan", publisher: { "@id": `${SITE}/#person` }, inLanguage: "en" },
  ],
};

export default async function Page() {
  const data = await getSiteData();
  const byId = new Map(data.items.map((i) => [i.id, i]));
  const work: ExhibitEntry[] = PLAN.flatMap((p) => {
    const item = byId.get(p.id);
    return item
      ? [{ plate: p.plate, id: item.id, title: item.title, meta: item.meta, line: p.line(item), href: item.href, also: p.also, visuals: item.visuals }]
      : [];
  });
  const shown = new Set(work.map((w) => w.id));
  const rest = data.items
    .filter((i) => !shown.has(i.id))
    .sort((a, b) => b.year - a.year)
    .map((i) => ({ id: i.id, title: i.title, meta: i.meta, href: i.href }));
  const essays = data.essays.map((e) => ({ slug: e.slug, title: e.title, dateLabel: e.dateLabel, readingMinutes: e.readingMinutes, href: e.href }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(identityJsonLd) }} />
      {/* The full site index, inline, for agents that read the HTML at /. Also at /llms.txt. */}
      <script type="text/markdown" id="site-index" data-canonical="/llms.txt" dangerouslySetInnerHTML={{ __html: escapeForScript(buildLlmsIndex()) }} />
      <PageTransition>
      <div className={`${display.variable} ${mono.variable} ${ms.labels}`}>
        <Monolith interests={interestSections()} name={data.name} tagline={data.tagline} links={data.links} work={work} essays={essays} rest={rest} />
      </div>
      </PageTransition>
    </>
  );
}
