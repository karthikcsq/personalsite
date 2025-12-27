"use client";

import React, { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import Link from 'next/link';
import { scrollToCenter } from '@/utils/scrollUtils';

export default function GalleryPage() {
  const [galleryData, setGalleryData] = useState<{ [folder: string]: string[] }>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on a mobile device
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial value
    checkIsMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);
    
    // Fetch the folder and image data from the API
    fetch('/api/gallery')
      .then((res) => res.json())
      .then((data) => setGalleryData(data));
      
    // Clean up
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return (
    <section className="relative flex flex-col min-h-screen text-white overflow-hidden">
      <div className="max-w-full mx-auto w-full px-4 pt-16 pb-16 md:pr-32 lg:pr-40 relative" style={{ zIndex: 10 }}>
        {/* Title Section */}
        <div className="flex flex-col items-center justify-center min-h-screen md:pl-32 lg:pl-40">
          <h1 className="text-5xl md:text-7xl font-light text-center font-quicksand mb-6 tracking-tight">
            Gallery
          </h1>
          <p className="text-center text-lg text-gray-400 tracking-wide max-w-2xl mx-auto mb-12">
            A visual journey through my travels and adventures
          </p>

          {/* Arrow Button */}
          <Link
            href="#images"
            onClick={(event) => scrollToCenter(event, "#images")}
            className="mt-8 self-center w-10 h-10 flex items-center justify-center rounded-full hover:scale-110 transition-transform duration-300 text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>
        </div>

        {/* Gallery Section */}
        <div id="images"></div>
        <div className="flex flex-col items-start py-20 space-y-24">
          {Object.entries(galleryData).map(([folder, images], index) => (
            <div key={folder} className="w-full max-w-[1400px] px-4 md:px-8">
              <h2 className="text-2xl md:text-3xl font-light uppercase tracking-widest mb-8 font-quicksand">
                {folder}
              </h2>
              <EmblaCarousel images={images} isMobile={isMobile} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmblaCarousel({
  images,
  isMobile
}: {
  images: string[],
  isMobile: boolean
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    containScroll: 'trimSnaps',
    dragFree: true,
    slidesToScroll: isMobile ? 1 : 2
  });

  useEffect(() => {
    if (emblaApi) {
      // Reinitialize Embla when isMobile changes
      emblaApi.reInit();
    }
  }, [emblaApi, isMobile]);

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  return (
    <div className="embla w-full">
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container flex items-center">
          {images.map((src, index) => (
            <div
              key={index}
              className={`embla__slide flex items-center justify-center flex-shrink-0 ${
                isMobile ? 'w-full' : 'w-1/2'
              } px-3`}
            >
              <div className="relative w-full rounded-2xl overflow-hidden group cursor-pointer">
                <Image
                  src={src}
                  alt={`Image ${index + 1}`}
                  width={800}
                  height={600}
                  className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-center mt-8 space-x-6">
        <button
          className="embla__prev p-3 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-105"
          onClick={scrollPrev}
          aria-label="Previous image"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          className="embla__next p-3 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-105"
          onClick={scrollNext}
          aria-label="Next image"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}