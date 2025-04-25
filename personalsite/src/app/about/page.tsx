'use client';
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { scrollToCenter } from "@/utils/scrollUtils";

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on a mobile device
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial value
    checkIsMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const buttonClass =
    "w-40 h-12 text-lg font-semibold rounded-full font-quicksand bg-white text-black flex items-center justify-center hover:scale-110 transition-transform duration-300";
  
  return (
    <section className="relative flex flex-col min-h-screen text-white text-left overflow-hidden">
      {/* Background Image */}
      <div
        className="fixed top-0 left-0 w-full h-full bg-cover bg-center -z-10"
        style={{ 
          backgroundImage: "url('/spacebg.jpg')",
          backgroundAttachment: "fixed", 
        }}
      ></div>

      {/* DESKTOP LAYOUT */}
      {!isMobile && (
        <>
          {/* Main Content (Fixed on the Left) */}
          <div
            className="fixed top-0 left-0 h-full w-1/3 flex flex-col justify-center space-y-4 px-6 sm:px-8 py-8 z-20 backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.05)" }}
          >
            <h1 className="font-quicksand font-sans text-4xl sm:text-5xl font-bold mb-4">Karthik Thyagarajan</h1>
          </div>

          {/* Right Content (Scrollable Section) */}
          <div className="ml-[33.33%] w-[66.67%] flex flex-col min-h-screen justify-center space-y-16 p-8">
            {/* Summary */}
            <div className="relative flex flex-col items-start min-h-screen justify-center">
              <div className="relative flex flex-col border border-white rounded-md items-start justify-center p-8"
                style={{ 
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  boxShadow: "0 0 10px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.4)",
                }}>
                <h2 className="font-quicksand text-4xl text-white font-bold mb-6">Welcome</h2>
                <p className="font-quicksand text-lg sm:text-xl">
                  Welcome! My name is Karthik. I&apos;m a student, machine learning engineer, quantum computing enthusiast, and budding entrepreneur. 
                </p>
                <p className="font-quicksand text-lg sm:text-xl">
                  I love photography, music, and traveling. Feel free to explore my site and reach out to me.
                </p>
              </div>
              {/* Arrow Button */}
              <Link
                href="#quote" 
                onClick={(event) => scrollToCenter(event, "#quote")}
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

            {/* Quote */}
            <div className="relative rounded-xl flex flex-col items-start justify-center p-4 m-8 mt-16 mb-64"
              style={{ 
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                boxShadow: "0 0 10px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.4)"
              }}
              id="quote">
              <p className="font-quicksand text-xl italic text-white">
                &quot;He who has a why to live for can bear almost any how.&quot;
              </p>
              <p className="font-quicksand text-lg text-white self-end mt-2">
                - Friedrich Nietzsche
              </p>
            </div>

            {/* Currently Exploring */}
            <div className="relative flex flex-col items-start justify-center mb-12">
              <h2 className="font-quicksand text-4xl text-white font-bold mb-6">Currently Exploring</h2>
              <ul className="font-quicksand text-lg text-white list-disc pl-6 space-y-2">
                <li>Robotics foundation models</li>
                <li>AR/XR long-form video analysis</li>
                <li>3D Simultaneous Localization and Mapping (SLAM)</li>
              </ul>
            </div>

            {/* Education */}
            <div className="relative flex flex-col items-start justify-center">
              <h2 className="font-quicksand text-4xl text-white font-bold mb-6">Education</h2>
              <h3 className="font-quicksand text-2xl text-white font-semibold mb-4">Purdue University</h3>
              <p className="font-quicksand text-lg text-white rounded-md">
                B.S. in Computer Science & Artificial Intelligence
              </p>
            </div>

            {/* Resources */}
            <div className="relative flex flex-col items-start space-y-6 justify-center">
              <h2 className="font-quicksand text-4xl text-white font-bold mb-6">Resources</h2>
              
              <div className="flex items-center space-x-8">
                <a
                  href="https://www.linkedin.com/in/karthikthyagarajan06"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonClass} hover:bg-blue-400`}
                >
                  LinkedIn
                </a>
                <h2 className="font-quicksand text-2xl text-white">
                  Connect with me
                </h2>
              </div>
              
              <div className="flex items-center space-x-8">
                <a
                  href="https://github.com/karthikcsq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonClass} hover:bg-gray-600`}
                >
                  GitHub
                </a>
                <h2 className="font-quicksand text-2xl text-white">
                  Take a look at my projects
                </h2>
              </div>
              
              <div className="flex items-center space-x-8">
                <a
                  href="/resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonClass} hover:bg-purple-300`}
                >
                  Resume
                </a>
                <h2 className="font-quicksand text-2xl text-white">
                  Download my resume
                </h2>
              </div>
              
              <div className="flex items-center space-x-8">
                <a
                  href="mailto:karthik6002@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonClass} hover:bg-red-400`}
                >
                  Email
                </a>
                <h2 className="font-quicksand text-2xl text-white">
                  Want to collaborate? Email me
                </h2>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MOBILE LAYOUT */}
      {isMobile && (
        <div className="max-w-4xl mx-auto w-full p-4 pt-28 pb-16">
          {/* Header Section */}
          <div className="text-center mb-12 backdrop-blur-sm bg-black/20 p-6 rounded-lg">
            <h1 className="font-quicksand text-4xl font-bold mb-4">Karthik Thyagarajan</h1>
            <div className="w-24 h-1 mx-auto bg-white my-4"></div>
            <div className="mt-6">
              <p className="font-quicksand text-lg max-w-2xl mx-auto">
                Welcome! I&apos;m a student, machine learning engineer, quantum computing enthusiast, and budding entrepreneur. 
                I love photography, music, and traveling. Feel free to explore my site and reach out to me.
              </p>
            </div>
            
            {/* Arrow Button */}
            <Link
              href="#quote-mobile" 
              onClick={(event) => scrollToCenter(event, "#quote-mobile")}
              className="mt-8 inline-block w-12 h-12 flex items-center justify-center rounded-full bg-transparent text-white"
            >
              <Image
                src="/downarrow.svg"
                alt="Down Arrow"
                width={36}
                height={36}
              />
            </Link>
          </div>
          
          {/* Quote Section */}
          <div 
            className="relative rounded-xl flex flex-col items-start justify-center p-6 my-12 backdrop-blur-sm"
            style={{ 
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              boxShadow: "0 0 10px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.4)"
            }}
            id="quote-mobile"
          >
            <p className="font-quicksand text-xl italic text-white">
              &quot;He who has a why to live for can bear almost any how.&quot;
            </p>
            <p className="font-quicksand text-lg text-white self-end mt-2">
              - Friedrich Nietzsche
            </p>
          </div>
          
          {/* Currently Exploring Section */}
          <div className="relative rounded-lg backdrop-blur-sm p-6 my-12"
            style={{ 
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              boxShadow: "0 0 10px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.4)"
            }}
          >
            <h2 className="font-quicksand text-3xl text-white font-bold mb-6">Currently Exploring</h2>
            <ul className="font-quicksand text-lg text-white list-disc pl-6 space-y-2">
              <li>Robotics foundation models</li>
              <li>AR/XR long-form video analysis</li>
              <li>3D Simultaneous Localization and Mapping (SLAM)</li>
            </ul>
          </div>
          
          {/* Education Section */}
          <div className="relative rounded-lg backdrop-blur-sm p-6 my-12"
            style={{ 
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              boxShadow: "0 0 10px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.4)"
            }}
          >
            <h2 className="font-quicksand text-3xl text-white font-bold mb-6">Education</h2>
            <h3 className="font-quicksand text-2xl text-white font-semibold mb-4">Purdue University</h3>
            <p className="font-quicksand text-lg text-white">
              B.S. in Computer Science & Artificial Intelligence
            </p>
          </div>
          
          {/* Resources Section */}
          <div className="relative rounded-lg backdrop-blur-sm p-6 my-12"
            style={{ 
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              boxShadow: "0 0 10px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.4)"
            }}
          >
            <h2 className="font-quicksand text-3xl text-white font-bold mb-6">Resources</h2>
            
            <div className="space-y-6">
              {/* LinkedIn */}
              <div className="flex flex-col space-y-2">
                <a
                  href="https://www.linkedin.com/in/karthikthyagarajan06"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonClass} hover:bg-blue-400 self-start`}
                >
                  LinkedIn
                </a>
                <h2 className="font-quicksand text-xl text-white">
                  Connect with me
                </h2>
              </div>
              
              {/* GitHub */}
              <div className="flex flex-col space-y-2">
                <a
                  href="https://github.com/karthikcsq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonClass} hover:bg-gray-600 self-start`}
                >
                  GitHub
                </a>
                <h2 className="font-quicksand text-xl text-white">
                  Take a look at my projects
                </h2>
              </div>
              
              {/* Resume */}
              <div className="flex flex-col space-y-2">
                <a
                  href="/resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonClass} hover:bg-purple-300 self-start`}
                >
                  Resume
                </a>
                <h2 className="font-quicksand text-xl text-white">
                  Download my resume
                </h2>
              </div>
              
              {/* Email */}
              <div className="flex flex-col space-y-2">
                <a
                  href="mailto:karthik6002@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonClass} hover:bg-red-400 self-start`}
                >
                  Email
                </a>
                <h2 className="font-quicksand text-xl text-white">
                  Want to collaborate? Email me
                </h2>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}