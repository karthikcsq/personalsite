import Image from "next/image";

export default function ProjectsPage() {
  return (
      <section className="relative flex flex-col font-quicksand text-white text-left overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute top-0 left-0 w-full h-full bg-cover bg-center -z-10"
          style={{
            backgroundImage: "url('/robothand.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        ></div>

        {/* Dark Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50 -z-10"></div>

        {/* Header Content */}
        <div className="relative z-10 flex items-center justify-center my-32 p-4">
          <h2 className="text-4xl font-bold text-center">Projects</h2>
        </div>

        {/* Projects Content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-4 py-16 space-y-8">
          {/* Project 1 */}
          <div className="max-w-2xl text-center">
            <h2 className="text-3xl font-bold mb-4">Verbatim</h2>
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
                className="inline-block"
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
                className="inline-block px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Website
              </a>
            </div>
          </div>
        </div>
      </section>
  );
}