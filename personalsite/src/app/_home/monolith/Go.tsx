import Link from "next/link";
import type { ComponentProps } from "react";

// Links inside the site navigate in place (the music keeps playing);
// everything else is an ordinary link.
export default function Go({ href, from, onClick, ...rest }: ComponentProps<"a"> & { href: string; from?: string }) {
  if (!href.startsWith("/")) return <a href={href} onClick={onClick} {...rest} />;
  return (
    <Link
      href={href}
      onClick={(e) => {
        // the page's back link returns to the section the visitor came from
        if (from) try { sessionStorage.setItem("mo-back", JSON.stringify({ path: href, hash: from })); } catch {}
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
