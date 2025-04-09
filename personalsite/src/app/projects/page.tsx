"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { scrollToCenter } from '@/utils/scrollUtils';

export default function ProjectsPage() {
  return (
      <section className="relative flex flex-col font-quicksand text-white text-left overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute top-0 left-0 w-full h-full bg-cover bg-center -z-10"
          style={{
            backgroundImage: "url('/robothand.png')",
            backgroundAttachment: "fixed", 
            // Make dimmer
            filter: "brightness(0.7)",
          }}
        ></div>

        {/* Dark Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50 -z-10"></div>

        {/* Header Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
          <h2 className="text-4xl font-bold text-center">Projects</h2>
          <Link
          href="#images" 
          onClick={(event) => scrollToCenter(event, "#projects")}
          className="mt-6 self-center w-12 h-12 flex items-center justify-center rounded-full bg-transparent text-white hover:scale-110 transition-transform duration-300"
            >
              <Image
              src="/downarrow.svg"
              alt="Down Arrow"
              width={48}
              height={48}
              />
          </Link>
        </div>

        {/* Projects Content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-4 py-16 space-y-8">
          {/* Verbatim */}
          <motion.div 
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(243, 152, 20, 0.9)",
              boxShadow: "0 0 10px rgba(243, 152, 20, 0.8), 0 0 20px rgba(243, 152, 20, 0.6)", // Glowing effect
             }}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, delay: 0.2 }}
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
          </motion.div>

          {/* FORMulator */}
          <motion.div 
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(244, 194, 156, 0.9)",
              boxShadow: "0 0 10px rgba(244, 194, 156, 0.8), 0 0 20px rgba(244, 194, 156, 0.6)", // Glowing effect
             }}
             initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5 }}
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
          </motion.div>

          {/* QKD */}
          <motion.div 
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(87, 20, 243, 0.9)",
              boxShadow: "0 0 10px rgba(87, 20, 243, 0.8), 0 0 20px rgba(87, 20, 243, 0.6)", // Glowing effect
             }}
             initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5 }}
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
                href="/QKDResearchPoster.pdf"
                className="inline-block px-6 py-3 text-lg font-semibold text-black bg-white rounded-lg hover:bg-indigo-900 hover:text-white hover:scale-110 hover:transition duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Research Poster
              </a>
            </div>
          </motion.div>

          {/* Kmeans SOM */}
          <motion.div 
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(199, 56, 56, 0.9)",
              boxShadow: "0 0 10px rgba(199, 56, 56, 0.8), 0 0 20px rgba(199, 56, 56, 0.6)", // Glowing effect
             }}
             initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5 }}
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
          </motion.div>

          {/* Quantum Racer */}
          <motion.div 
            className="max-w-2xl text-center p-6 rounded-lg shadow-lg backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(13, 155, 161, 0.9)",
              boxShadow: "0 0 10px rgba(13, 155, 161, 0.8), 0 0 20px rgba(13, 155, 161, 0.6)", // Glowing effect
             }}
             initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5 }}
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
          </motion.div>
        </div>
      </section>
  );
}