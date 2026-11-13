"use client";

// "← Karthik Thyagarajan": back to the part of the home page the visitor came
// from (an Also item returns to Also, not Work). Falls back to `href`.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

function savedBack(pathname: string): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem("mo-back") ?? "null") as { path: string; hash: string } | null;
    if (saved && saved.path.split(/[?#]/)[0] === pathname) return `/${saved.hash}`;
  } catch {}
  return null;
}

export default function BackLink({ href, className }: { href: string; className?: string }) {
  const pathname = usePathname();
  const to = useSyncExternalStore(noop, () => savedBack(pathname) ?? href, () => href);
  return (
    <Link className={className} href={to}>
      ← Karthik Thyagarajan
    </Link>
  );
}
