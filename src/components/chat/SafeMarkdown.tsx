"use client";

import ReactMarkdown from "react-markdown";

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

/**
 * XSS-safe markdown renderer.
 *
 * ReactMarkdown does not render raw HTML by default,
 * so XSS protection comes from the link component override
 * that blocks javascript: and data: URLs.
 */
export function SafeMarkdown({ content, className }: SafeMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a: ({ href, children, ...props }) => {
            // Block javascript: and data: URLs
            if (
              href &&
              (href.startsWith("javascript:") || href.startsWith("data:"))
            ) {
              return <span>{children}</span>;
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
