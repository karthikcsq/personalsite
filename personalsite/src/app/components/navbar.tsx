"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/work", label: "Work" },
  { href: "/projects", label: "Projects" },
  { href: "/involvement", label: "Involvement" },
  { href: "/blog", label: "Writing" },
  { href: "/gallery", label: "Photography" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--color-hairline)] bg-[var(--color-surface)]/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-[20px] italic leading-none text-[var(--color-ink)]">
              karthik
            </span>
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-accent)]" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-sm transition-colors ${
                    active
                      ? "text-[var(--color-ink)]"
                      : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-[var(--color-accent)]" />
                  )}
                </Link>
              );
            })}
            {pathname !== "/" && (
              <Link
                href="/"
                className="text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-accent)]"
              >
                ← Ask the chat
              </Link>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)] md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile sheet */}
      <div
        className={`fixed inset-0 z-30 bg-[var(--color-surface)] transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex h-full flex-col items-start gap-6 px-6 pt-24">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`font-serif text-[32px] italic transition-colors ${
                  active
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-ink)] hover:text-[var(--color-accent)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {pathname !== "/" && (
            <Link
              href="/"
              className="mt-6 text-sm text-[var(--color-ink-muted)]"
            >
              ← Ask the chat
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
