"use client";
import { JobEntry } from "@/utils/jobUtils";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { scrollToCenter } from "@/utils/scrollUtils";

interface Props { jobs: JobEntry[] }

export function WorkTimelineClient({ jobs }: Props) {
  return (
    <section className="min-h-screen text-white py-12 px-6">
      <div className="fixed inset-0 -z-10 animate-gradient"></div>
      <style jsx>{`
        @keyframes gradient { 0% {background-position:0% 50%;} 50% {background-position:100% 50%;} 100% {background-position:0% 50%;}}
        .animate-gradient {background: radial-gradient(circle, rgb(0, 29, 82) 0%, rgb(0, 0, 0) 100%); background-size:200% 200%; animation:gradient 10s ease infinite; position:fixed; top:0; left:0; width:100%; height:100%;}
      `}</style>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-4xl font-bold text-center">Work Experience</h2>
        <Link
          href="#work"
          onClick={(event) => scrollToCenter(event, "#work")}
          className="mt-6 self-center w-12 h-12 flex items-center justify-center rounded-full bg-transparent text-white hover:scale-110 transition-transform duration-300"
        >
          <Image src="/downarrow.svg" alt="Down Arrow" width={48} height={48} />
        </Link>
      </div>
      <div className="relative gap-8 max-w-4xl mx-auto">
        <div className="absolute left-[50px] top-0 h-full w-1" style={{ backgroundColor: "rgba(255,255,255,1)", boxShadow: `0 0 10px rgba(255,255,255,0.6), 0 0 10px rgba(255,255,255,0.4)`}}></div>
        {jobs.map((job, index) => {
          const rgbValues = job.color.match(/\d+/g);
          if (!rgbValues) return null;
          const rgbaBackground = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.4)`;
          const rgbaBorder = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.9)`;
          const rgbaShadow1 = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.8)`;
          const rgbaShadow2 = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.6)`;
          return (
            <motion.div key={index} className="grid grid-cols-[100px_1fr] mb-8 gap-8" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} viewport={{ once: false }} transition={{ duration: 0.5, delay: 0.1 }}>
              <div className="relative flex items-center justify-center" id="work">
                <div className="w-25 h-25 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: "rgba(255,255,255,1)", boxShadow: `0 0 10px rgba(255,255,255,0.6), 0 0 10px rgba(255,255,255,0.4)` }}>
                  <Image src={job.icon} alt={`${job.title} Icon`} width={80} height={80} className="object-contain" />
                </div>
              </div>
              <div className="relative flex flex-col items-start p-6 rounded-lg shadow-lg text-white" style={{ backgroundColor: rgbaBackground, border: `2px solid ${rgbaBorder}`, boxShadow: `0 0 10px ${rgbaShadow1}, 0 0 20px ${rgbaShadow2}` }}>
                <div className="mb-2">
                  <h2 className="text-xl font-semibold">{job.title}</h2>
                  <p className="text-sm text-gray-200">{job.company}</p>
                  <p className="text-sm text-gray-200">{job.year}</p>
                </div>
                <ul className="list-disc list-inside text-gray-300">
                  {job.description.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
