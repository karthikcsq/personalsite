"use client";
import { JobEntry } from "@/utils/jobUtils";
import Image from "next/image";
import Link from "next/link";
import { scrollToCenter } from "@/utils/scrollUtils";

interface Props { jobs: JobEntry[] }

// Calculate relative luminance to determine if color is light or dark
function getTextColor(r: number, g: number, b: number): string {
  // Convert RGB to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;

  // Return dark text for light backgrounds, light text for dark backgrounds
  // Lower threshold (0.4) = more lenient, dark text on more backgrounds
  return luminance > 0.4 ? '#1f2937' : '#ffffff';
}

export function WorkTimelineClient({ jobs }: Props) {
  return (
    <section className="relative min-h-screen text-white py-12 px-4 sm:px-6 overflow-x-hidden">
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
      <div className="relative gap-8 max-w-4xl mx-auto px-4 sm:px-0" style={{ zIndex: 10 }}>
        <div className="absolute left-[39px] sm:left-[50px] top-0 h-full w-1" style={{ backgroundColor: "rgba(255,255,255,1)", boxShadow: `0 0 10px rgba(255,255,255,0.6), 0 0 10px rgba(255,255,255,0.4)`, zIndex: 10 }}></div>
        {jobs.map((job, index) => {
          const rgbValues = job.color.match(/\d+/g);
          if (!rgbValues) return null;
          const r = parseInt(rgbValues[0]);
          const g = parseInt(rgbValues[1]);
          const b = parseInt(rgbValues[2]);
          const rgbaBackground = `rgba(${r}, ${g}, ${b}, 1)`;
          const rgbaBorder = `rgba(${r}, ${g}, ${b}, 0.9)`;
          const rgbaShadow1 = `rgba(${r}, ${g}, ${b}, 0.3)`;
          const rgbaShadow2 = `rgba(${r}, ${g}, ${b}, 0.2)`;
          const textColor = getTextColor(r, g, b);
          return (
            <div key={index} className="grid grid-cols-[50px_1fr] sm:grid-cols-[100px_1fr] mb-8 gap-4 sm:gap-8 relative" style={{ zIndex: 10 }}>
              <div className="relative flex items-center justify-center" id="work">
                <div className="w-12 h-12 sm:w-25 sm:h-25 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: "rgba(255,255,255,1)", boxShadow: `0 0 10px rgba(255,255,255,0.6), 0 0 10px rgba(255,255,255,0.4)`, zIndex: 10 }}>
                  <Image src={job.icon} alt={`${job.title} Icon`} width={48} height={48} className="w-8 h-8 sm:w-20 sm:h-20 object-contain" />
                </div>
              </div>
              <div className="relative flex flex-col items-start p-4 sm:p-6 rounded-lg shadow-lg" style={{ backgroundColor: rgbaBackground, border: `2px solid ${rgbaBorder}`, boxShadow: `0 0 10px ${rgbaShadow1}, 0 0 20px ${rgbaShadow2}`, color: textColor }}>
                <div className="mb-2">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: textColor }}>{job.title}</h2>
                  <p className="text-xs sm:text-sm" style={{ color: textColor, opacity: 0.8 }}>{job.company}</p>
                  <p className="text-xs sm:text-sm" style={{ color: textColor, opacity: 0.8 }}>{job.year}</p>
                </div>
                <ul className="list-disc list-inside text-sm sm:text-base" style={{ color: textColor, opacity: 0.9 }}>
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
