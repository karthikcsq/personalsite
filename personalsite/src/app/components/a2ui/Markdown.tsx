"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { normalizeA2UIPath } from "@/a2ui/protocol";

/** Shared A2UI prose renderer. Internal portfolio paths become links, unknown
 * absolute paths render as plain text. Every link opens in a new tab so the
 * in-memory conversation survives. */
export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a: ({ href, children, ...props }) => {
            const internalPath = href ? normalizeA2UIPath(href) : null;
            if (internalPath) {
              return (
                <Link href={internalPath} target="_blank" rel="noopener">
                  {children}
                </Link>
              );
            }
            if (href?.startsWith("/")) return <span>{children}</span>;
            return (
              <a
                {...props}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          p: ({ ...props }) => <p {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
