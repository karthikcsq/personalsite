import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MinimalInterior from "@/app/components/MinimalInterior";
import CorpusPageTransition from "@/app/components/CorpusPageTransition";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "Karthik Thyagarajan — a builder, researcher, and writer studying Computer Science and AI at Purdue.",
};

const paths = [
  { label: "Work", href: "/?section=work" },
  { label: "Projects", href: "/?section=projects" },
  { label: "Writing", href: "/?section=writing" },
  { label: "Involvement", href: "/?section=involvement" },
];

const connect = [
  { label: "Email", href: "mailto:karthik6002@gmail.com" },
  { label: "GitHub", href: "https://github.com/karthikcsq" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/karthikthyagarajan06" },
  { label: "Résumé", href: "/resume.pdf" },
];

export default function AboutPage() {
  return (
    <CorpusPageTransition page="about">
      <MinimalInterior page="about">
      <main className={styles.page}>
        <div className={styles.intro}>
          <div className={styles.introHeading}>
            <p className={styles.eyebrow}>About</p>
            <h1>Someone who can&apos;t leave a good idea alone.</h1>
          </div>
          <figure className={styles.portrait}>
            <Image
              src="/karthik-headshot.jpg"
              alt="Portrait of Karthik Thyagarajan"
              width={1568}
              height={1337}
              sizes="(max-width: 760px) 300px, 270px"
              priority
            />
          </figure>
          <div className={styles.prose}>
            <p>
              I&apos;m Karthik. I study Computer Science and Artificial Intelligence
              at Purdue, and I tend to build things that are too ambitious for
              the week I have.
            </p>
            <p>
              That habit led me to co-found Repple and buildpurdue, a campus
              accelerator. It also takes me into research labs and hackathons.
              I care about systems that actually ship, and interfaces that
              respect the person using them.
            </p>
            <p>
              I work across ML, robotics, and product engineering. I&apos;m not
              precious about which layer of the stack I&apos;m on, as long as the
              thing gets out the door.
            </p>
          </div>
        </div>

        <div className={styles.lower}>
          <section className={styles.paths} aria-labelledby="about-paths">
            <h2 id="about-paths" className={styles.eyebrow}>Explore</h2>
            <div className={styles.pathList}>
              {paths.map((path) => (
                <Link key={path.label} href={path.href}>
                  <span>{path.label}</span><span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          </section>

          <aside className={styles.personal}>
            <Link href="/gallery" className={styles.photoLink} aria-label="See my photographs">
              <Image
                src="https://kt-personalsite.s3.us-east-2.amazonaws.com/galleryimgs/Costa Rica/20231221_125936.jpg"
                alt="A photograph from Karthik's Costa Rica album"
                fill
                sizes="(max-width: 760px) 100vw, 340px"
                className={styles.photo}
                unoptimized
              />
            </Link>
            <Link href="/gallery" className={styles.photoCaption}>
              Photos ↗
            </Link>
          </aside>
        </div>

        <footer className={styles.footer}>
          <div>
            <p className={styles.eyebrow}>Based at Purdue</p>
            <p>West Lafayette, Indiana · B.S. Computer Science &amp; AI, 2027</p>
          </div>
          <nav aria-label="Connect">
            {connect.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </footer>
      </main>
      </MinimalInterior>
    </CorpusPageTransition>
  );
}
