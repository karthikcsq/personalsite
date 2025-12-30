"use client";
import { JobEntry } from "@/utils/jobUtils";
import Image from "next/image";
import Link from "next/link";
import { scrollToCenter } from "@/utils/scrollUtils";

interface Props { jobs: JobEntry[] }

export function WorkTimelineClient({ jobs }: Props) {
  return (
    <section className="relative min-h-screen text-white py-12 px-4 sm:px-6 overflow-x-hidden">
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen md:pl-32 lg:pl-40 md:pr-32 lg:pr-40">
        <h1 className="text-5xl md:text-7xl font-light text-center font-host-grotesk mb-6 tracking-tight">Work Experience</h1>
        <p className="text-center text-lg text-gray-400 tracking-wide max-w-2xl mx-auto mb-12">
          My professional journey and experiences
        </p>
        <Link
          href="#work"
          onClick={(event) => scrollToCenter(event, "#work")}
          className="mt-8 self-center w-10 h-10 flex items-center justify-center rounded-full hover:scale-110 transition-transform duration-300 text-gray-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Link>
      </div>
      <div className="relative gap-8 max-w-4xl mx-auto px-4 sm:px-0" style={{ zIndex: 10 }}>
        <div className="absolute left-[39px] sm:left-[50px] top-0 h-full w-1" style={{ backgroundColor: "rgba(255,255,255,1)", boxShadow: `0 0 10px rgba(255,255,255,0.6), 0 0 10px rgba(255,255,255,0.4)`, zIndex: 10 }}></div>
        {jobs.map((job, index) => {
          const rgbValues = job.color.match(/\d+/g);
          if (!rgbValues) return null;
          const r = parseInt(rgbValues[0]);
          const g = parseInt(rgbValues[1]);
          const b = parseInt(rgbValues[2]);
          const rgbaBorder = `rgba(${r}, ${g}, ${b}, 0.9)`;
          const rgbaShadow1 = `rgba(${r}, ${g}, ${b}, 0.8)`;
          const rgbaShadow2 = `rgba(${r}, ${g}, ${b}, 0.6)`;
          return (
            <div key={index} className="grid grid-cols-[50px_1fr] sm:grid-cols-[100px_1fr] mb-8 gap-4 sm:gap-8 relative" style={{ zIndex: 10 }}>
              <div className="relative flex items-center justify-center" id="work">
                <div className="w-12 h-12 sm:w-25 sm:h-25 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: "rgba(255,255,255,1)", boxShadow: `0 0 10px rgba(255,255,255,0.6), 0 0 10px rgba(255,255,255,0.4)`, zIndex: 10 }}>
                  <Image src={job.icon} alt={`${job.title} Icon`} width={48} height={48} className="w-8 h-8 sm:w-20 sm:h-20 object-contain" />
                </div>
              </div>
              <div className="relative flex flex-col items-start p-4 sm:p-6 rounded-lg shadow-lg backdrop-blur-xs text-white" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", border: `2px solid ${rgbaBorder}`, boxShadow: `0 0 10px ${rgbaShadow1}, 0 0 20px ${rgbaShadow2}` }}>
                <div className="mb-2">
                  <h2 className="text-lg sm:text-xl font-semibold">{job.title}</h2>
                  <p className="text-xs sm:text-sm text-gray-300">{job.company}</p>
                  <p className="text-xs sm:text-sm text-gray-300">{job.year}</p>
                </div>
                <ul className="list-disc list-inside text-sm sm:text-base text-gray-200">
                  {job.description.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
