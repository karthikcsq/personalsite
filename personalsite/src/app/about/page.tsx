'use client';
import { useState, useEffect, useRef } from "react";

export default function AboutPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const skills = [
    "Machine Learning", "PyTorch", "Computer Vision", "Quantum Computing",
    "Next.js", "TypeScript", "Python", "AWS", "Robotics", "AR/XR"
  ];

  const interests = [
    { label: "Photography", color: "from-purple-500/10 to-pink-500/10" },
    { label: "Music", color: "from-blue-500/10 to-cyan-500/10" },
    { label: "Travel", color: "from-orange-500/10 to-red-500/10" },
    { label: "AI/ML", color: "from-green-500/10 to-emerald-500/10" }
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-red-600/20 rounded-full blur-3xl"
          style={{
            top: '10%',
            left: '15%',
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        />
        <div
          className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"
          style={{
            bottom: '10%',
            right: '10%',
            transform: `translate(${mousePosition.x * -0.03}px, ${mousePosition.y * -0.03}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        />
        <div
          className="absolute w-72 h-72 bg-blue-600/20 rounded-full blur-3xl"
          style={{
            top: '50%',
            left: '50%',
            transform: `translate(${mousePosition.x * 0.015}px, ${mousePosition.y * 0.015}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        />
      </div>

      {/* Subtle grid pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-24 md:pr-32 lg:pr-40">
        {/* Hero Section */}
        <div ref={heroRef} className="mb-8 animate-fadeIn">
          <div className="mb-8">
            <h1 className="font-quicksand text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight text-white mb-4">
              Karthik Thyagarajan
            </h1>
            <div className="h-px w-24 bg-gradient-to-r from-red-500 to-transparent"></div>
          </div>

          <p className="font-quicksand text-xl sm:text-2xl text-white/50 mb-6 font-light animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            Building intelligent systems at the intersection of ML, robotics, and quantum computing
          </p>

        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-2 mb-6 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          {skills.map((skill, idx) => (
            <span
              key={skill}
              className="px-3 py-1.5 bg-white/5 border border-white/10 text-xs font-quicksand text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white/90 transition-all duration-200 cursor-default"
              style={{ animationDelay: `${0.5 + idx * 0.1}s` }}
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Connect Section */}
        <div className="mb-20 group relative overflow-hidden bg-white/[0.03] border border-white/10 p-6 backdrop-blur-sm hover:border-white/20 transition-all duration-300 animate-slideUp">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/0 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10">
            <div className="mb-4">
              <h2 className="font-quicksand text-lg font-light text-white/90 mb-1">Connect</h2>
              <div className="h-px w-12 bg-gradient-to-r from-red-500/50 to-transparent"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <a
                href="https://www.linkedin.com/in/karthikthyagarajan06"
                target="_blank"
                rel="noopener noreferrer"
                className="group/link relative overflow-hidden bg-white/[0.02] border border-white/10 p-4 hover:border-blue-400/30 transition-all duration-200"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200" />
                <div className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <p className="font-quicksand font-normal text-white text-xs">LinkedIn</p>
                </div>
              </a>

              <a
                href="https://github.com/karthikcsq"
                target="_blank"
                rel="noopener noreferrer"
                className="group/link relative overflow-hidden bg-white/[0.02] border border-white/10 p-4 hover:border-gray-400/30 transition-all duration-200"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-500/0 to-gray-500/5 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200" />
                <div className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <p className="font-quicksand font-normal text-white text-xs">GitHub</p>
                </div>
              </a>

              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="group/link relative overflow-hidden bg-white/[0.02] border border-white/10 p-4 hover:border-purple-400/30 transition-all duration-200"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200" />
                <div className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="font-quicksand font-normal text-white text-xs">Resume</p>
                </div>
              </a>

              <a
                href="mailto:karthik6002@gmail.com"
                className="group/link relative overflow-hidden bg-white/[0.02] border border-white/10 p-4 hover:border-red-400/30 transition-all duration-200"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-500/5 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200" />
                <div className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="font-quicksand font-normal text-white text-xs">Email</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">

          {/* About Card - Spans 2 columns */}
          <div className="lg:col-span-2 group relative overflow-hidden bg-white/[0.03] border border-white/10 p-8 backdrop-blur-sm hover:border-white/20 transition-all duration-300 animate-slideUp">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/0 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="mb-6">
                <h2 className="font-quicksand text-2xl font-light text-white/90 mb-1">About</h2>
                <div className="h-px w-12 bg-gradient-to-r from-red-500/50 to-transparent"></div>
              </div>
              <p className="font-quicksand text-base text-white/60 leading-relaxed mb-4 font-light">
                CS & AI student at Purdue University. Working on startups, AR/XR video analysis, and 3D SLAM systems.
                Previously built ML infrastructure at scale and developed quantum algorithms for real-world applications.
              </p>
              <p className="font-quicksand text-base text-white/60 leading-relaxed font-light">
                Passionate about pushing the boundaries of what&apos;s possible with intelligent systems.
              </p>
            </div>
          </div>

          {/* Education Card */}
          <div className="group relative overflow-hidden bg-white/[0.03] border border-white/10 p-8 backdrop-blur-sm hover:border-white/20 transition-all duration-300 animate-slideUp" style={{ animationDelay: '0.1s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="mb-6">
                <h2 className="font-quicksand text-2xl font-light text-white/90 mb-1">Education</h2>
                <div className="h-px w-12 bg-gradient-to-r from-purple-500/50 to-transparent"></div>
              </div>
              <h3 className="font-quicksand text-lg font-normal text-white mb-2">Purdue University</h3>
              <p className="font-quicksand text-sm text-white/50 leading-relaxed font-light">
                B.S. in Computer Science & Artificial Intelligence
              </p>
            </div>
          </div>

          {/* Currently Exploring Card */}
          <div className="group relative overflow-hidden bg-white/[0.03] border border-white/10 p-8 backdrop-blur-sm hover:border-white/20 transition-all duration-300 animate-slideUp" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="mb-6">
                <h2 className="font-quicksand text-2xl font-light text-white/90 mb-1">Currently Exploring</h2>
                <div className="h-px w-12 bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-3 group/item">
                  <span className="text-red-500/70 mt-1.5 text-xs">━</span>
                  <span className="font-quicksand text-sm text-white/60 group-hover/item:text-white/80 transition-colors font-light">Robotics foundation models</span>
                </li>
                <li className="flex items-start gap-3 group/item">
                  <span className="text-red-500/70 mt-1.5 text-xs">━</span>
                  <span className="font-quicksand text-sm text-white/60 group-hover/item:text-white/80 transition-colors font-light">AR/XR long-form video analysis</span>
                </li>
                <li className="flex items-start gap-3 group/item">
                  <span className="text-red-500/70 mt-1.5 text-xs">━</span>
                  <span className="font-quicksand text-sm text-white/60 group-hover/item:text-white/80 transition-colors font-light">3D SLAM systems</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Interests Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4 animate-slideUp" style={{ animationDelay: '0.3s' }}>
            {interests.map((interest, idx) => (
              <div
                key={interest.label}
                className="group relative overflow-hidden bg-white/[0.03] border border-white/10 p-6 backdrop-blur-sm hover:border-white/20 transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${interest.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <p className="font-quicksand text-sm font-light text-white/60 group-hover:text-white/80 transition-colors">{interest.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quote Card */}
          <div className="lg:col-span-3 group relative overflow-hidden bg-white/[0.03] border border-white/10 p-8 backdrop-blur-sm hover:border-white/20 transition-all duration-300 animate-slideUp" style={{ animationDelay: '0.4s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/0 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10 h-full flex flex-col justify-center">
              <div className="mb-6">
                <div className="h-px w-8 bg-gradient-to-r from-red-500/50 to-transparent mb-4"></div>
              </div>
              <p className="font-quicksand text-base text-white/70 mb-4 leading-relaxed font-light">
                He who has a why to live for can bear almost any how.
              </p>
              <p className="font-quicksand text-xs text-white/40 font-light">— Friedrich Nietzsche</p>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fadeIn {
          animation: fadeIn 1s ease-out forwards;
          opacity: 0;
        }

        .animate-slideUp {
          animation: slideUp 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}