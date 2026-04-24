"use client";
import { usePathname } from "next/navigation";
import Navbar from "@/app/components/navbar";

export default function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <>
      {!isHome && <Navbar />}
      <main className={isHome ? "" : "min-h-screen"}>{children}</main>
    </>
  );
}
