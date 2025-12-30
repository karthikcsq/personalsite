"use client";

import Image from "next/image";
import Link from "next/link";
import { scrollToCenter } from '@/utils/scrollUtils';

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
          {/* Caladrius */}
          <div
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(103, 190, 217, 0.9)",
              boxShadow: "0 0 10px rgba(103, 190, 217, 0.8), 0 0 20px rgba(103, 190, 217, 0.6)", // Glowing effect
             }}
          >
            <h2 className="text-3xl font-bold mb-4" id="projects">Caladrius</h2>
            <p className="text-lg mb-6">
              Caladrius is a privacy-first AI triage assistant. It aims to cut through the inefficiencies of triage intake and inequities in prioritization, while maintaining a privacy-first HIPAA-compliant ethos.
              Awarded 2nd place in HackGT 12&apos;s track for social impact.
            </p>
            <div className="mb-6">
              <iframe
                className="w-full rounded-lg shadow-lg"
                width="500"
                height="375"
                src="https://www.youtube.com/embed/1fI_w06EoZQ"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://github.com/karthikcsq/Caladrius"
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
              <a
                href="https://devpost.com/software/caladrius"
                className="inline-block px-6 py-3 text-lg font-semibold text-black bg-white rounded-lg hover:bg-blue-300 hover:scale-110 hover:transition duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Devpost
              </a>
            </div>
          </div>
          {/* InTheLoop */}
          <div
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(80, 80, 80, 0.9)",
              boxShadow: "0 0 10px rgba(80, 80, 80, 0.8), 0 0 20px rgba(80, 80, 80, 0.6)", // Glowing effect
             }}
          >
            <h2 className="text-3xl font-bold mb-4" id="projects">In The Loop</h2>
            <p className="text-lg mb-6">
              In The Loop is a platform that ends the pain of AI assumption and token wastage. It provides a seamless experience for users to add clarity to their AI interactions, ensuring that the AI understands their needs without unnecessary back-and-forth.
            </p>
            <div className="flex flex-col items-center justify-center my-8 space-y-12">
              <Image
                src="/intheloop.png"
                alt="In The Loop"
                width={350}
                height={300}
                className="rounded-lg shadow-md border-3 border-gray-700"
              />
            </div>
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://github.com/karthikcsq/in-the-loop-frontend"
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
              <a
                href="https://in-the-loop-ai.vercel.app/"
                className="inline-block px-6 py-3 text-lg font-semibold text-black bg-white rounded-lg hover:bg-gray-400 hover:scale-110 hover:transition duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
            </div>
          </div>
          {/* Storytime */}
          <div
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(3, 126, 214, 0.9)",
              boxShadow: "0 0 10px rgba(3, 126, 214, 0.8), 0 0 20px rgba(3, 126, 214, 0.6)", // Glowing effect
             }}
          >
            <h2 className="text-3xl font-bold mb-4" id="projects">Storytime.ai</h2>
            <p className="text-lg mb-6">
              Storytime is an innovative platform that transforms the way we consume and interact with news. Using AI, Storytime intelligently groups individual stories and story updates so that you can see what you care about, without the noise.
            </p>
            <div className="flex flex-col items-center justify-center my-8 space-y-12">
              <Image
                src="/storytimetimeline1.png"
                alt="Storytime Timeline"
                width={350}
                height={300}
                className="rounded-lg shadow-md border-3 border-gray-700"
              />
            </div>
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://storytime-sepia.vercel.app/"
                className="inline-block px-6 py-3 text-lg font-semibold text-black bg-white rounded-lg hover:bg-blue-800 hover:scale-110 hover:transition duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
            </div>
          </div>
          {/* Verbatim */}
          <div
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(243, 152, 20, 0.9)",
              boxShadow: "0 0 10px rgba(243, 152, 20, 0.8), 0 0 20px rgba(243, 152, 20, 0.6)", // Glowing effect
             }}
          >
            <h2 className="text-3xl font-bold mb-4" id="projects">Verbatim</h2>
            <p className="text-lg mb-6">
              Verbatim is an intelligent platform that takes any video, summarizes it for quicker consumption, translates it into multiple languages, and then recreates the speaker’s lip movements to match the new audio—delivering a seamless, localized experience.
            </p>
            <div className="mb-6">
              <iframe
                className="w-full rounded-lg shadow-lg"
                width="500"
                height="375"
                src="https://www.youtube.com/embed/LGS8Pe7L3Gw"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://github.com/TheXDShrimp/verbatim"
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
              <a
                href="https://www.getverbatim.tech"
                className="inline-block px-6 py-3 text-lg font-semibold text-black bg-white rounded-lg hover:bg-orange-400 hover:scale-110 hover:transition duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
            </div>
          </div>

          {/* FORMulator */}
          <div
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(244, 194, 156, 0.9)",
              boxShadow: "0 0 10px rgba(244, 194, 156, 0.8), 0 0 20px rgba(244, 194, 156, 0.6)", // Glowing effect
             }}
            >
            <h2 className="text-3xl font-bold mb-4" id="projects">FORMulator</h2>
            <p className="text-lg mb-6">
              FORMulator allows users to perfect any type of body movement on their own, by leveraging computer vision technology to provide instant feedback. The app uses a combination of pose estimation and machine learning to analyze the user&apos;s movements and provide real-time feedback on their form, helping them to improve their performance.
            </p>
            <div className="mb-6">
              <iframe
                className="w-full rounded-lg shadow-lg"
                width="500"
                height="375"
                src="https://youtube.com/embed/4HB9wkMFed8"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://github.com/karthikcsq/FORMulator"
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
            </div>
          </div>

          {/* QKD */}
          <div
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(87, 20, 243, 0.9)",
              boxShadow: "0 0 10px rgba(87, 20, 243, 0.8), 0 0 20px rgba(87, 20, 243, 0.6)", // Glowing effect
             }}
            >
            <h2 className="text-3xl font-bold mb-4" id="projects">Photonic Implementation of QKD</h2>
            <p className="text-lg mb-6">
              Quantum Key Distribution (QKD) is a method of secure communication that uses quantum mechanics to exchange cryptographic keys. This project focuses on the photonic implementation of QKD with near-infrared lasers, utilizing the principles of quantum mechanics to ensure secure communication between two parties.
            </p>
            <div className="flex flex-col items-center justify-center my-8 space-y-12">
              <Image
                src="/qkd_setup.png"
                alt="Image 2"
                width={350}
                height={300}
                className="rounded-lg shadow-md border-3 border-gray-700"
              />
            </div>
            
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://arxiv.org/abs/2509.04389"
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
              <a
                href="/QKDResearchPoster.pdf"
                className="inline-block px-6 py-3 text-lg font-semibold text-black bg-white rounded-lg hover:bg-indigo-900 hover:text-white hover:scale-110 hover:transition duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Research Poster
              </a>
              

            </div>
          </div>

          {/* Kmeans SOM */}
          <div
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(199, 56, 56, 0.9)",
              boxShadow: "0 0 10px rgba(199, 56, 56, 0.8), 0 0 20px rgba(199, 56, 56, 0.6)", // Glowing effect
             }}
            >
            <h2 className="text-3xl font-bold mb-4" id="projects">Enhancing Cluster Cohesion: Integrating Self-Organizing Maps with K-Means Clustering for Improving Unsupervised Learning Distinctions</h2>
            <p className="text-lg mb-6">
              This project explores how SOM, known for its capability to uncover topological structures, fared against traditional centroid-based approaches in capturing intricate data relationships.
            </p>
            <div className="flex flex-col items-center justify-center my-8 space-y-12">
              <Image
                src="/SOM.png"
                alt="Image 2"
                width={300}
                height={300}
                className="rounded-lg shadow-md border-3 border-gray-700"
              />
            </div>
            <div className="flex items-center justify-center space-x-4">
              <a
                href="/K_Means_SOM.pdf"
                className="inline-block px-6 py-3 text-lg font-semibold text-black bg-white rounded-lg hover:bg-red-800 hover:text-white hover:scale-110 hover:transition duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Research Preprint
              </a>
            </div>
          </div>

          {/* Quantum Racer */}
          <div
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(13, 155, 161, 0.9)",
              boxShadow: "0 0 10px rgba(13, 155, 161, 0.8), 0 0 20px rgba(13, 155, 161, 0.6)", // Glowing effect
             }}
            >
            <h2 className="text-3xl font-bold mb-4" id="projects">Quantum Racer</h2>
            <p className="text-lg mb-6">
              Quantum Racer is a simple car racing game that teaches players about quantum decoherence and noise by challenging them to navigate a quantum car through a track while avoiding obstacles. The game is designed to be fun and educational, making it suitable for players of all ages.
            </p>
            <div className="mb-6">
              <iframe
                className="w-full rounded-lg shadow-lg"
                width="500"
                height="375"
                src="https://youtube.com/embed/3OGC_il_6Hc"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://github.com/karthikcsq/QuantumCarGame_Self"
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
            </div>
          </div>
        </div>
      </section>
  );
}