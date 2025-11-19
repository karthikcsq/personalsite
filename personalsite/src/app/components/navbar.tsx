'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isMobile]);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/projects", label: "Projects" },
    { href: "/work", label: "Work" },
    { href: "/gallery", label: "Gallery" },
    { href: "/blog", label: "Blog" },
  ];

  // Find current page index for distance calculation
  const currentIndex = navItems.findIndex(item =>
    pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
  );

  if (isMobile) {
    return (
      <>
        {/* Hamburger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-6 right-6 z-[60] w-12 h-12 flex flex-col items-center justify-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/20 rounded-lg transition-all duration-300 hover:bg-black/60"
          aria-label="Toggle menu"
        >
          <span
            className={`w-6 h-0.5 bg-white transition-all duration-300 ${
              isOpen ? 'rotate-45 translate-y-2' : ''
            }`}
          />
          <span
            className={`w-6 h-0.5 bg-white transition-all duration-300 ${
              isOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`w-6 h-0.5 bg-white transition-all duration-300 ${
              isOpen ? '-rotate-45 -translate-y-2' : ''
            }`}
          />
        </button>

        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsOpen(false)}
        />

        {/* Mobile Menu */}
        <nav
          className={`fixed top-0 right-0 h-screen w-64 bg-black/90 backdrop-blur-xl border-l border-white/10 z-50 transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col justify-center h-full px-6 py-20">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href ||
                              (item.href !== "/" && pathname?.startsWith(item.href));

              return (
                <div key={item.href} className="relative">
                  {/* Top line - slides in from left */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5 bg-white transition-all duration-500 ease-in-out origin-left"
                    style={{
                      transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                      opacity: isActive ? 1 : 0
                    }}
                  ></div>

                  {/* Bottom line - slides in from left */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white transition-all duration-500 ease-in-out origin-left"
                    style={{
                      transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                      opacity: isActive ? 1 : 0
                    }}
                  ></div>

                  <Link
                    href={item.href}
                    className={`
                      block text-white font-medium px-6 py-4 rounded-lg text-left
                      transition-all duration-300 ease-in-out
                      hover:bg-white/10 hover:translate-x-2
                    `}
                    style={{
                      transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
                    }}
                  >
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  // Desktop navigation (original)
  return (
    <nav className="fixed right-0 top-0 h-screen flex items-center z-50">
      <div className="flex flex-col justify-center h-full py-12 px-8">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href ||
                          (item.href !== "/" && pathname?.startsWith(item.href));

          // Calculate distance from current page (0 = current, 1 = adjacent, etc.)
          const distance = currentIndex >= 0 ? Math.abs(index - currentIndex) : 0;

          // Fade based on distance: current = 1, adjacent = 0.7, far = 0.4
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.7 : 0.4;

          return (
            <div key={item.href} className="relative">
              {/* Top line - slides in from left */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5 bg-white transition-all duration-500 ease-in-out origin-left"
                style={{
                  transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                  opacity: isActive ? 1 : 0
                }}
              ></div>

              {/* Bottom line - slides in from left */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white transition-all duration-500 ease-in-out origin-left"
                style={{
                  transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                  opacity: isActive ? 1 : 0
                }}
              ></div>

              <Link
                href={item.href}
                className={`
                  block text-white font-medium px-4 py-3 rounded-lg text-center
                  transition-all duration-300 ease-in-out
                  hover:bg-white/10 hover:opacity-100
                `}
                style={{ opacity }}
              >
                {item.label}
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}