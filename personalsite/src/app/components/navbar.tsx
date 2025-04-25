'use client';
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="text-white fixed top-4 left-0 w-full px-4 z-50">
      <div className="flex justify-end">
        <div className={`bg-transparent border border-gray-700 font-quicksand rounded-full px-6 py-2 backdrop-blur-lg
                        ${isMobile ? 'flex justify-end items-center' : 'flex items-center space-x-6'}`}>
          
          {/* Desktop Menu */}
          {!isMobile && (
            <div className="flex space-x-4">
              <Link href="/" className="px-4 py-2 rounded-full hover:bg-gray-700 transition-colors">Home</Link>
              <Link href="/about" className="px-4 py-2 rounded-full hover:bg-gray-700 transition-colors">About</Link>
              <Link href="/projects" className="px-4 py-2 rounded-full hover:bg-gray-700 transition-colors">Projects</Link>
              <Link href="/work" className="px-4 py-2 rounded-full hover:bg-gray-700 transition-colors">Work</Link>
              <Link href="/gallery" className="px-4 py-2 rounded-full hover:bg-gray-700 transition-colors">Gallery</Link>
            </div>
          )}
          
          {/* Mobile Hamburger Button */}
          {isMobile && (
            <button 
              onClick={toggleMenu}
              className="relative w-10 h-10 flex flex-col justify-center items-center focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <span className={`block w-6 h-0.5 bg-white mb-1.5 transition-transform ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-white mb-1.5 transition-opacity ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
              <span className={`block w-6 h-0.5 bg-white transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobile && isMenuOpen && (
        <div className="absolute right-4 top-16 mt-2 w-48 bg-gray-900/90 backdrop-blur-lg rounded-lg border border-gray-700 shadow-lg py-2 transition-all">
          <Link 
            href="/" 
            className="block px-4 py-3 text-white hover:bg-gray-800 transition-colors"
            onClick={closeMenu}
          >
            Home
          </Link>
          <Link 
            href="/about" 
            className="block px-4 py-3 text-white hover:bg-gray-800 transition-colors"
            onClick={closeMenu}
          >
            About
          </Link>
          <Link 
            href="/projects" 
            className="block px-4 py-3 text-white hover:bg-gray-800 transition-colors"
            onClick={closeMenu}
          >
            Projects
          </Link>
          <Link 
            href="/work" 
            className="block px-4 py-3 text-white hover:bg-gray-800 transition-colors"
            onClick={closeMenu}
          >
            Work
          </Link>
          <Link 
            href="/gallery" 
            className="block px-4 py-3 text-white hover:bg-gray-800 transition-colors"
            onClick={closeMenu}
          >
            Gallery
          </Link>
        </div>
      )}
    </nav>
  );
}