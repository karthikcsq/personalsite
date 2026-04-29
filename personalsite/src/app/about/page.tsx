import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Karthik Thyagarajan — CS & AI at Purdue, building ML systems for robotics and startups.",
};

const SKILLS = [
  "Machine Learning",
  "PyTorch",
  "Computer Vision",
  "Robotics",
  "Quantum Computing",
  "TypeScript",
  "Python",
  "C++",
  "AWS",
  "AR / XR",
];

const EXPLORING = [
  "MCP and agent-callable real-world services",
  "Agents that save time, not just effort",
  "Chat-first interfaces and AI-native product surfaces",
  "Founder density at the undergrad level",
];

const INTERESTS = [
  { label: "Photography", image: "/interests/photography-interest.jpg", href: "/gallery" },
  { label: "Music", image: "/interests/music-interest.jpg" },
  { label: "Travel", image: "/interests/travel-interest.jpg" },
  { label: "AI / ML", image: "/interests/ai-interest.jpg" },
];

const CONNECT = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/karthikthyagarajan06" },
  { label: "GitHub", href: "https://github.com/karthikcsq" },
  { label: "Email", href: "mailto:karthik6002@gmail.com" },
  { label: "Resume (PDF)", href: "/resume.pdf" },
];

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-[720px] px-5 pt-16 pb-24 md:px-6 md:pt-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
        About
      </p>

      <h1 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.02] tracking-[-0.02em] text-[var(--color-ink)]">
        Karthik Thyagarajan.
      </h1>

      <p className="mt-6 max-w-[620px] font-serif text-[clamp(1.05rem,1.8vw,1.3rem)] italic leading-snug text-[var(--color-ink-muted)]">
        Someone who can't leave a good idea alone.
      </p>

      <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
        {CONNECT.map((c) => (
          <li key={c.label}>
            <a
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group inline-flex items-baseline gap-1.5 text-[15px] text-[var(--color-ink)] transition-colors hover:text-[var(--color-accent)]"
            >
              <span className="border-b border-[var(--color-hairline-strong)] pb-0.5 group-hover:border-[var(--color-accent)]">
                {c.label}
              </span>
              <span className="text-[var(--color-ink-faint)] transition-colors group-hover:text-[var(--color-accent)]">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>

      <section className="mt-14 space-y-5 text-[16px] leading-[1.75] text-[var(--color-ink)]">
        <p>
          I grew up building things that were probably too ambitious for the week I
          had. That habit followed me into college: I am a founding engineer at Repple,
          co-founded buildpurdue (a campus accelerator), and spend the rest of my time
          in research labs and hackathons.
        </p>
        <p>
          What I care about: systems that actually ship, interfaces that respect the
          person using them, and the stretch of engineering where ML, robotics, and
          quantum brush against each other. I am not precious about which layer of the
          stack I work on, as long as the thing gets out the door.
        </p>
      </section>

      <Divider />

      <Section label="Education">
        <p className="text-[16px] text-[var(--color-ink)]">
          <span className="font-medium">Purdue University</span>
          <span className="text-[var(--color-ink-subtle)]"> · 2023–2027</span>
        </p>
        <p className="mt-1 text-[14.5px] text-[var(--color-ink-muted)]">
          B.S. in Computer Science &amp; Artificial Intelligence (double major).
        </p>
      </Section>

      <Divider />

      <Section label="Currently exploring">
        <ul className="space-y-2.5">
          {EXPLORING.map((item) => (
            <li
              key={item}
              className="relative pl-5 text-[15.5px] leading-relaxed text-[var(--color-ink)]"
            >
              <span className="absolute left-0 top-[10px] h-px w-3 bg-[var(--color-accent)]" />
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Divider />

      <Section label="Skills">
        <p className="text-[15px] leading-[1.9] text-[var(--color-ink)]">
          {SKILLS.map((skill, i) => (
            <span key={skill}>
              {skill}
              {i < SKILLS.length - 1 && (
                <span className="mx-2 text-[var(--color-ink-faint)]">·</span>
              )}
            </span>
          ))}
        </p>
      </Section>

      <Divider />

      <Section label="Interests">
        <div className="grid grid-cols-2 gap-3">
          {INTERESTS.map((interest) => {
            const Tag = interest.href ? Link : "div";
            const props = interest.href ? { href: interest.href } : {};
            return (
              <Tag
                key={interest.label}
                {...(props as { href: string })}
                className="group relative block aspect-[4/3] overflow-hidden rounded-md"
              >
                <Image
                  src={interest.image}
                  alt={interest.label}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 768px) 50vw, 360px"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[oklch(20%_0.018_55_/_0.55)] to-transparent p-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-surface)]">
                    {interest.label}
                  </span>
                </div>
              </Tag>
            );
          })}
        </div>
      </Section>

      <Divider />

      <blockquote className="my-10 border-l-2 border-[var(--color-accent)] pl-6">
        <p className="font-serif text-[20px] italic leading-snug text-[var(--color-ink-muted)]">
          He who has a why to live for can bear almost any how.
        </p>
        <footer className="mt-3 text-[13px] text-[var(--color-ink-subtle)]">
          Friedrich Nietzsche
        </footer>
      </blockquote>
    </article>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="my-10">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
        {label}
      </p>
      {children}
    </section>
  );
}

function Divider() {
  return <div className="h-px bg-[var(--color-hairline)]" />;
}
