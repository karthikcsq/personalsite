"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { normalizeA2UIPath } from "@/a2ui/protocol";

/** Shared A2UI prose renderer. Internal portfolio paths become client-side
 * links, unknown absolute paths render as plain text, and anything external
 * opens in a new tab. */
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
              return <Link href={internalPath}>{children}</Link>;
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
