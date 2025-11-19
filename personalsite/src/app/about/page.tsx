'use client';

import { Linkedin, Github, Mail, FileText, Code, GraduationCap, Lightbulb, Quote } from 'lucide-react';
import { useMemo } from 'react';

export default function AboutPage() {

  const skills = [
    "Machine Learning", "PyTorch", "Computer Vision", "Quantum Computing",
    "TypeScript", "C++", "Python", "AWS", "Robotics", "AR/XR"
  ];

  const interests = [
    { label: "Photography", image: "/interests/photography-interest.jpg" },
    { label: "Music", image: "/interests/music-interest.jpg" },
    { label: "Travel", image: "/interests/travel-interest.jpg" },
    { label: "AI/ML", image: "/interests/ai-interest.jpg" }
  ];

  return (
    <div className="relative min-h-screen text-premium-100 overflow-hidden">
      {/* Background Image with premium overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/sunrise.jpg')",
          backgroundAttachment: "fixed",
          zIndex: 0
        }}
      />
      {/* Premium dark overlay */}
      <div className="fixed inset-0 bg-premium-950/70 backdrop-blur-sm" style={{ zIndex: 1 }} />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28 md:pr-32 lg:pr-40 relative" style={{ zIndex: 10 }}>
        {/* Hero Section */}
        <div className="mb-12 animate-fade-in">
          <div className="mb-10">
            <h1 className="font-quicksand text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight text-premium-50 mb-6">
              Karthik Thyagarajan
            </h1>
            <div className="h-0.5 w-20 bg-gradient-to-r from-accent-500 to-transparent"></div>
          </div>

          <p className="font-quicksand text-xl sm:text-2xl text-premium-200 mb-8 font-light max-w-3xl leading-relaxed">
            Building intelligent systems at the intersection of ML, robotics, and quantum computing
          </p>

        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-3 mb-10 animate-fade-in">
          {skills.map((skill) => (
            <span
              key={skill}
              className="px-4 py-2 bg-premium-800/40 backdrop-blur-md border border-premium-700/40 text-sm font-quicksand text-premium-200 hover:bg-premium-800/60 hover:border-accent-600/40 hover:text-premium-100 transition-all duration-300 cursor-default rounded-lg shadow-premium"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Connect Section */}
        <div className="mb-12 group relative overflow-hidden bg-premium-900/40 border border-accent-600/30 p-8 backdrop-blur-xl hover:border-accent-600/50 transition-all duration-300 rounded-xl shadow-premium-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-600/5 to-accent-700/10 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <Mail className="w-5 h-5 text-accent-500" />
              <h2 className="font-quicksand text-2xl font-medium text-premium-50">Connect</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <a
                href="https://www.linkedin.com/in/karthikthyagarajan06"
                target="_blank"
                rel="noopener noreferrer"
                className="group/link relative overflow-hidden bg-premium-800/30 border border-premium-700/30 p-5 hover:border-blue-500/40 hover:bg-premium-800/50 transition-all duration-300 rounded-lg shadow-premium"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/10 opacity-0 group-hover/link:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center gap-3">
                  <Linkedin className="w-5 h-5 text-premium-300 group-hover/link:text-blue-400 transition-colors" />
                  <p className="font-quicksand font-medium text-premium-100 text-sm">LinkedIn</p>
                </div>
              </a>

              <a
                href="https://github.com/karthikcsq"
                target="_blank"
                rel="noopener noreferrer"
                className="group/link relative overflow-hidden bg-premium-800/30 border border-premium-700/30 p-5 hover:border-gray-400/40 hover:bg-premium-800/50 transition-all duration-300 rounded-lg shadow-premium"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-500/0 to-gray-500/10 opacity-0 group-hover/link:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center gap-3">
                  <Github className="w-5 h-5 text-premium-300 group-hover/link:text-gray-300 transition-colors" />
                  <p className="font-quicksand font-medium text-premium-100 text-sm">GitHub</p>
                </div>
              </a>

              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="group/link relative overflow-hidden bg-premium-800/30 border border-premium-700/30 p-5 hover:border-purple-500/40 hover:bg-premium-800/50 transition-all duration-300 rounded-lg shadow-premium"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/10 opacity-0 group-hover/link:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-premium-300 group-hover/link:text-purple-400 transition-colors" />
                  <p className="font-quicksand font-medium text-premium-100 text-sm">Resume</p>
                </div>
              </a>

              <a
                href="mailto:karthik6002@gmail.com"
                className="group/link relative overflow-hidden bg-premium-800/30 border border-premium-700/30 p-5 hover:border-red-500/40 hover:bg-premium-800/50 transition-all duration-300 rounded-lg shadow-premium"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-500/10 opacity-0 group-hover/link:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center gap-3">
                  <Mail className="w-5 h-5 text-premium-300 group-hover/link:text-red-400 transition-colors" />
                  <p className="font-quicksand font-medium text-premium-100 text-sm">Email</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">

          {/* About Card */}
          <div className="lg:col-span-2 group relative overflow-hidden bg-premium-900/40 border border-premium-700/30 p-10 backdrop-blur-xl hover:border-accent-600/40 transition-all duration-300 rounded-xl shadow-premium-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-600/5 to-premium-800/10 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="mb-8 flex items-center gap-3">
                <Code className="w-6 h-6 text-accent-500" />
                <h2 className="font-quicksand text-2xl font-medium text-premium-50">About</h2>
              </div>
              <p className="font-quicksand text-base text-premium-300 leading-relaxed mb-5 font-light">
                CS & AI student at Purdue University. Working on startups, AR/XR video analysis, and full stack applications.
                Previously built ML infrastructure at scale and developed quantum algorithms for real-world applications.
              </p>
              <p className="font-quicksand text-base text-premium-300 leading-relaxed font-light">
                Passionate about pushing the boundaries of what&apos;s possible with intelligent systems.
              </p>
            </div>
          </div>

          {/* Education Card */}
          <div className="group relative overflow-hidden bg-premium-900/40 border border-premium-700/30 p-10 backdrop-blur-xl hover:border-accent-600/40 transition-all duration-300 rounded-xl shadow-premium-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-600/5 to-premium-800/10 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="mb-8 flex items-center gap-3">
                <GraduationCap className="w-6 h-6 text-accent-500" />
                <h2 className="font-quicksand text-2xl font-medium text-premium-50">Education</h2>
              </div>
              <h3 className="font-quicksand text-lg font-medium text-premium-100 mb-3">Purdue University</h3>
              <p className="font-quicksand text-sm text-premium-400 leading-relaxed font-light">
                B.S. in Computer Science & Artificial Intelligence
              </p>
            </div>
          </div>

          {/* Currently Exploring Card */}
          <div className="group relative overflow-hidden bg-premium-900/40 border border-premium-700/30 p-10 backdrop-blur-xl hover:border-accent-600/40 transition-all duration-300 rounded-xl shadow-premium-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-600/5 to-premium-800/10 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="mb-8 flex items-center gap-3">
                <Lightbulb className="w-6 h-6 text-accent-500" />
                <h2 className="font-quicksand text-2xl font-medium text-premium-50">Currently Exploring</h2>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2 flex-shrink-0"></div>
                  <span className="font-quicksand text-base text-premium-300 font-light">Reinforcement learning for IoT security</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2 flex-shrink-0"></div>
                  <span className="font-quicksand text-base text-premium-300 font-light">AR/XR video memory systems</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2 flex-shrink-0"></div>
                  <span className="font-quicksand text-base text-premium-300 font-light">Neural radiance fields & 3D SLAM</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2 flex-shrink-0"></div>
                  <span className="font-quicksand text-base text-premium-300 font-light">Multi-agent systems & RAG pipelines</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Interests Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {interests.map((interest) => {
              const Component = interest.label === "Photography" ? "a" : "div";
              const linkProps = interest.label === "Photography" ? { href: "/gallery" } : {};

              return (
                <Component
                  key={interest.label}
                  {...linkProps}
                  className="group relative overflow-hidden border border-premium-700/30 backdrop-blur-sm hover:border-accent-600/40 transition-all duration-300 aspect-[4/3] rounded-xl shadow-premium-md cursor-pointer"
                >
                  {/* Background Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url(${interest.image})` }}
                  />
                  {/* Dark Overlay */}
                  <div className="absolute inset-0 bg-premium-950/50 group-hover:bg-premium-950/30 transition-colors duration-300" />
                  {/* Text */}
                  <div className="relative z-10 h-full flex items-center justify-center">
                    <p className="font-quicksand text-lg font-medium text-premium-50 drop-shadow-lg">{interest.label}</p>
                  </div>
                </Component>
              );
            })}
          </div>

          {/* Quote Card */}
          <div className="lg:col-span-3 group relative overflow-hidden bg-premium-900/40 border border-premium-700/30 p-8 backdrop-blur-xl hover:border-accent-600/40 transition-all duration-300 rounded-xl shadow-premium-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-600/5 to-premium-800/10 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10 flex items-center gap-4">
              <Quote className="w-10 h-10 text-accent-500/40 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-quicksand text-base text-premium-300 leading-relaxed font-light italic mb-3">
                  He who has a why to live for can bear almost any how.
                </p>
                <p className="font-quicksand text-xs text-premium-400 font-light">— Friedrich Nietzsche</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
