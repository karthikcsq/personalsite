"use client";

import Image from "next/image";
import Link from "next/link";
import { scrollToCenter } from '@/utils/scrollUtils';
import { projects } from '@/data/projectsData';
import type { Project, ProjectLink } from '@/data/projectsData';

function ProjectCard({ project, isFirst }: { project: Project; isFirst: boolean }) {
  const { display, links } = project;

  return (
    <div
      className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        border: `2px solid ${display.borderColor}`,
        boxShadow: `0 0 10px ${display.glowColor}, 0 0 20px ${display.glowColor.replace(/[\d.]+\)$/, '0.6)')}`,
      }}
    >
      <h2 className="text-3xl font-bold mb-4" {...(isFirst ? { id: "projects" } : {})}>
        {project.title}
      </h2>
      <p className="text-lg mb-6">{project.description}</p>

      {/* Embed (YouTube/Instagram) */}
      {display.embedUrl && (
        <div className="mb-6">
          <iframe
            className="w-full rounded-lg shadow-lg"
            width="500"
            height={display.embedHeight ?? 375}
            src={display.embedUrl}
            title={`${project.title} embed`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Images */}
      {display.images && display.images.length > 0 && (
        <div className="flex flex-col items-center justify-center my-8 space-y-6">
          {display.images.map((img) => (
            <Image
              key={img.src}
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              className="rounded-lg shadow-md border-3 border-gray-700"
            />
          ))}
        </div>
      )}

      {/* Links */}
      <div className="flex items-center justify-center space-x-4">
        {links.map((link) => (
          <ProjectLinkButton key={link.url} link={link} hoverColor={display.hoverColor} />
        ))}
      </div>
    </div>
  );
}

function ProjectLinkButton({ link, hoverColor }: { link: ProjectLink; hoverColor?: string }) {
  if (link.type === "github") {
    return (
      <a
        href={link.url}
        className="inline-block hover:scale-110 hover:transition duration-300"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src="/githublogo.png"
          alt="GitHub Logo"
          width={1125}
          height={417}
          className="w-32 h-13 bg-white p-2 rounded-lg shadow-md"
        />
      </a>
    );
  }

  if (link.type === "arxiv") {
    return (
      <a
        href={link.url}
        className="inline-block hover:scale-110 hover:transition duration-300"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src="/arxivlogo.jpg"
          alt="arXiv Logo"
          width={1125}
          height={417}
          className="h-13 w-auto bg-white p-2 rounded-lg shadow-md"
        />
      </a>
    );
  }

  const textHoverClass = link.type === "pdf" && hoverColor?.includes("indigo")
    ? `${hoverColor} hover:text-white`
    : link.type === "pdf" && hoverColor?.includes("red")
      ? `${hoverColor} hover:text-white`
      : hoverColor ?? "hover:bg-gray-400";

  return (
    <a
      href={link.url}
      className={`inline-block px-6 py-3 text-lg font-semibold text-black bg-white rounded-lg ${textHoverClass} hover:scale-110 hover:transition duration-300`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {link.label}
    </a>
  );
}

export default function ProjectsPage() {
  return (
    <section className="relative flex flex-col font-host-grotesk text-white text-left overflow-hidden">
      {/* Header Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen md:pl-32 lg:pl-40 md:pr-32 lg:pr-40 pt-24">
        <h1 className="text-5xl md:text-7xl font-light text-center font-host-grotesk mb-6 tracking-tight">Projects</h1>
        <p className="text-center text-lg text-gray-400 tracking-wide max-w-2xl mx-auto mb-12">
          Building solutions that make a difference
        </p>
        <Link
          href="#projects"
          onClick={(event) => scrollToCenter(event, "#projects")}
          className="mt-8 self-center w-10 h-10 flex items-center justify-center rounded-full hover:scale-110 transition-transform duration-300 text-gray-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Link>
      </div>

      {/* Projects Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-16 space-y-8">
        {projects.map((project, index) => (
          <ProjectCard key={project.id} project={project} isFirst={index === 0} />
        ))}
      </div>
    </section>
  );
}
