'use client';
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsMenuOpen(true);
    }
  };

  return (
    <nav className="text-white fixed top-4 right-4 z-50">
      {/* Hamburger Button */}
      <button 
        ref={buttonRef}
        onMouseEnter={handleMouseEnter}
        onClick={toggleMenu}
        className="relative w-12 h-12 flex flex-col justify-center items-center bg-gray-900/80 backdrop-blur-lg rounded-full border border-gray-700 focus:outline-none shadow-lg hover:bg-gray-800/80 transition-colors"
        aria-label="Toggle navigation menu"
      >
        <span className={`block w-6 h-0.5 bg-white mb-1.5 transition-transform duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
        <span className={`block w-6 h-0.5 bg-white mb-1.5 transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
        <span className={`block w-6 h-0.5 bg-white transition-transform duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
      </button>

      {/* Menu Dropdown */}
      {isMenuOpen && (
        <div 
          ref={menuRef}
          onMouseLeave={() => !isMobile && setIsMenuOpen(false)}
          className="absolute right-0 top-14 mt-2 w-56 bg-gray-900/90 backdrop-blur-lg rounded-lg border border-gray-700 shadow-lg py-2 transition-all"
          style={{ 
            animation: 'fadeIn 0.2s ease-out',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.2), 0 0 15px rgba(255, 255, 255, 0.1)'
          }}
        >
          <Link 
            href="/" 
            className="block px-5 py-3 text-white hover:bg-gray-800 transition-colors"
            onClick={closeMenu}
          >
            Home
          </Link>
          <Link 
            href="/about" 
            className="block px-5 py-3 text-white hover:bg-gray-800 transition-colors"
            onClick={closeMenu}
          >
            About
          </Link>
          <Link 
            href="/projects" 
            className="block px-5 py-3 text-white hover:bg-gray-800 transition-colors"
            onClick={closeMenu}
          >
            Projects
          </Link>
          <Link 
            href="/work" 
            className="block px-5 py-3 text-white hover:bg-gray-800 transition-colors"
            onClick={closeMenu}
          >
            Work
          </Link>
          <Link 
            href="/gallery" 
            className="block px-5 py-3 text-white hover:bg-gray-800 transition-colors"
            onClick={closeMenu}
          >
            Gallery
          </Link>
          <Link 
            href="/blog" 
            className="block px-5 py-3 text-white hover:bg-gray-800 transition-colors"
            onClick={closeMenu}
          >
            Blog
          </Link>
        </div>
      )}

      {/* Add this to your globals.css for the animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
}