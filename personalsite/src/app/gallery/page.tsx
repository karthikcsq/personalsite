"use client";

import React, { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import Link from 'next/link';
import { scrollToCenter } from '@/utils/scrollUtils';

export default function GalleryPage() {
  const [galleryData, setGalleryData] = useState<{ [folder: string]: string[] }>({});

  useEffect(() => {
    // Fetch the folder and image data from the API
    fetch('/api/gallery')
      .then((res) => res.json())
      .then((data) => setGalleryData(data));
  }, []);

  return (
    <section className="flex flex-col items-center justify-center mt-12 min-h-screen">
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold text-center">Gallery</h1>
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
      <div className="flex flex-col items-center justify-center my-12 space-y-12">
        {Object.entries(galleryData).map(([folder, images]) => (
          <div key={folder} className="w-full max-w-4xl" id="images">
            <h2 className="text-2xl font-bold text-center mb-4">{folder}</h2>
            <EmblaCarousel images={images} />
          </div>
        ))}
      </div>
    </section>
  );
}

function EmblaCarousel({ images }: { images: string[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  return (
    <div className="embla">
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container flex">
          {images.map((src, index) => (
            <div
              key={index}
              className="embla__slide flex items-center justify-center w-64 h-64 flex-shrink-0"
            >
              <Image
                src={src}
                alt={`Image ${index + 1}`}
                width={256}
                height={256}
                className="object-contain w-full h-full"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center mt-4">
        <button className="embla__prev p-2" onClick={scrollPrev}>
          <Image src="/leftarrow.svg" alt="Previous" width={36} height={36} />
        </button>
        <button className="embla__next p-2" onClick={scrollNext}>
          <Image src="/rightarrow.svg" alt="Next" width={36} height={36} />
        </button>
      </div>
    </div>
  );
}