"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { scrollToCenter } from "@/utils/scrollUtils";

export default function WorkPage() {
  const jobs = [
    {
      title: "Computer Vision Researcher",
      company: "OpenInterX",
      description: [
        "Engineering a scalable video memory and understanding framework to enhance AR applications by enabling long-term spatial and contextual awareness.",
        "Designing and optimizing a Python SDK for the Mavi platform, streamlining video analysis workflows for developers."
      ],
      year: "February 2025 - Present",
      color: "rgb(211, 211, 211)", // Unique color for each card
      icon: "/companies/openinterx.png", // Path to the icon
    },
    {
      title: "Undergraduate Researcher",
      company: "IDEAS Lab - Purdue University",
      description: [
        "Researching advanced 3D mapping techniques to enhance robotic perception and novel view synthesis, aiming to improve scene reconstruction accuracy.",
        "Implementing real-time SLAM (Simultaneous Localization and Mapping) algorithms to enable autonomous navigation and scene understanding in robotic systems."
      ],
      year: "March 2025 - Present",
      color: "rgb(27, 168, 203)", // Unique color for each card
      icon: "/companies/ideaslab.png", // Path to the icon
    },
    {
      title: "Undergraduate Data Science Researcher",
      company: "The Data Mine - Corporate Partners",
      description: [
        "Collaborated with AgRPA to create a weed detection system using UAVs for farms.",
        "Developed semantic segmentation and localization models to accurately locate weeds during real-time drone flight, speeding up ground-vehicle-based methods by 50%."
      ],
      year: "August 2024 - December 2024",
      color: "rgb(109, 255, 218)", // Unique color for each card
      icon: "/companies/agrpa.png", // Path to the icon
    },
    {
      title: "Science and Engineering Apprenticeship (SEAP) Intern",
      company: "Naval Research Laboratory",
      description: [
        "Led a team of four interns in the PALIS project, applying machine learning to underwater acoustics with a specific focus on the interaction between semantic segmentation and acoustic loss modeling.",
        "Developed and implemented cutting-edge image-to-image translation models using UNets, Transformers, and GANs, improving transmission loss prediction accuracy by 20% compared to traditional physics-engine-based methods.",
        "Implemented a secure Retrieval-Augmented Generation model that utilized confidential documents and information to respond to prompts."
      ],
      year: "June 2023 - August 2023",
      color: "rgb(0, 2, 110)", // Unique color for each card
      icon: "/companies/nrl.png", // Path to the icon
    },
    {
      title: "Integrated Photonics Design Engineer",
      company: "Instachip (Formerly Procyon Photonics)",
      description: [
        "Worked as part of a student-led startup to design powerful optical computing chips for neural network backpropagation and telecommunication.",
        "Designed optical circuits that combined digital and analog systems to perform powerful silicon-photonic computation."
      ],
      year: "November 2022–June 2024",
      color: "rgb(168, 96, 250)", // Unique color for each card
      icon: "/companies/procyon.png", // Path to the icon
    },
    {
      title: "Information Technology Assistant",
      company: "Fairfax County Public Schools",
      description: [
        "Performed maintenance on school technology over the summer. Reimaged 2,000 student laptops, installed server software, and maintained hardware."
      ],
      year: "June 2022 - August 2022",
      color: "rgb(172, 240, 255)", // Unique color for each card
      icon: "/companies/fcps.png", // Path to the icon
    }
  ];

  return (
    <section className="min-h-screen text-white py-12 px-6">
      {/* Moving Radial Gradient Background */}
      <div className="fixed inset-0 -z-10 animate-gradient"></div>

      <style jsx>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient {
          background: radial-gradient(circle, rgb(0, 29, 82) 0%, rgb(0, 0, 0) 100%);
          background-size: 200% 200%;
          animation: gradient 10s ease infinite;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>

      {/* Header Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-4xl font-bold text-center">Work Experience</h2>
        <Link
        href="#work" 
        onClick={(event) => scrollToCenter(event, "#work")}
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
      <div className="relative gap-8 max-w-4xl mx-auto">
        {/* Vertical Line */}
        <div className="absolute left-[50px] top-0 h-full w-1"
        style={{
          backgroundColor: "rgba(255,255,255,1)",
          boxShadow: `0 0 10px rgba(255,255,255,0.6), 0 0 10px rgba(255,255,255,0.4)`,
        }}></div>
        {jobs.map((job, index) => {
          // Extract RGB values from the color string
          const rgbValues = job.color.match(/\d+/g);
          if (!rgbValues) return null; // Fallback in case of unexpected format
          const rgbaBackground = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.4)`;
          const rgbaBorder = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.9)`;
          const rgbaShadow1 = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.8)`;
          const rgbaShadow2 = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.6)`;

          return (
            <motion.div
              key={index}
              className="grid grid-cols-[100px_1fr] mb-8 gap-8"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Left Column: Icon */}
              <div className="relative flex items-center justify-center"
                id="work">
                <div className="w-25 h-25 rounded-full flex items-center justify-center shadow-md"
                  style={{
                    backgroundColor: "rgba(255,255,255,1)",
                    boxShadow: `0 0 10px rgba(255,255,255,0.6), 0 0 10px rgba(255,255,255,0.4)`,
                  }}
                    >
                  <Image
                    src={job.icon}
                    alt={`${job.title} Icon`}
                    width={80}
                    height={80}
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Right Column: Job Panel */}
              <div
                key={index}
                className="relative flex flex-col items-start p-6 rounded-lg shadow-lg text-white"
                style={{
                  backgroundColor: rgbaBackground,
                  border: `2px solid ${rgbaBorder}`,
                  boxShadow: `0 0 10px ${rgbaShadow1}, 0 0 20px ${rgbaShadow2}`,
                }}
              >
                {/* Job Title, Company, and Year */}
                <div className="mb-2">
                  <h2 className="text-xl font-semibold">{job.title}</h2>
                  <p className="text-sm text-gray-200">{job.company}</p>
                  <p className="text-sm text-gray-200">{job.year}</p>
                </div>
                {/* Job Description */}
                <ul className="list-disc list-inside text-gray-300">
                  {job.description.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}