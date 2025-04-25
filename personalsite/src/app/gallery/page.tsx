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
    <section className="relative bg-black flex flex-col min-h-screen text-white overflow-hidden">
      <div className="max-w-full mx-auto w-full px-4 pt-24 pb-16">
        {/* Title Section */}
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-4xl font-bold text-center font-quicksand mb-4">Gallery</h1>
          <p className="text-center text-lg max-w-lg mx-auto mb-8">
            A collection of my photos from various travels and adventures.
          </p>
          
          {/* Arrow Button */}
          <Link
            href="#images" 
            onClick={(event) => scrollToCenter(event, "#images")}
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

        {/* Gallery Section */}
        <div id="images"></div>
        <div className="flex flex-col items-center justify-center my-12 space-y-16">
          {Object.entries(galleryData).map(([folder, images]) => (
            <div key={folder} className="w-full max-w-4xl backdrop-blur-sm bg-black/30 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-center mb-8 font-quicksand">{folder}</h2>
              <EmblaCarousel images={images} isMobile={isMobile} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmblaCarousel({ images, isMobile }: { images: string[], isMobile: boolean }) {
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
        <div className="embla__container flex">
          {images.map((src, index) => (
            <div
              key={index}
              className={`embla__slide flex items-center justify-center flex-shrink-0 ${
                isMobile ? 'w-full' : 'w-1/2'
              } px-2`}
            >
              <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                <Image
                  src={src}
                  alt={`Image ${index + 1}`}
                  fill
                  sizes={isMobile ? "100vw" : "50vw"}
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-center mt-6 space-x-4">
        <button 
          className="embla__prev p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
          onClick={scrollPrev}
          aria-label="Previous image"
        >
          <Image src="/leftarrow.svg" alt="Previous" width={30} height={30} />
        </button>
        <button 
          className="embla__next p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
          onClick={scrollNext}
          aria-label="Next image"
        >
          <Image src="/rightarrow.svg" alt="Next" width={30} height={30} />
        </button>
      </div>
    </div>
  );
}