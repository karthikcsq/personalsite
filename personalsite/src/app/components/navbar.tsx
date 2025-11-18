'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

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