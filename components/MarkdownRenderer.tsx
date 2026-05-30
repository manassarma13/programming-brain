"use client";

import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "var(--font-mono)",
});

const Mermaid = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (err) {
        console.error("Mermaid parsing error:", err);
      }
    };
    renderChart();
  }, [chart]);

  return (
    <div
      ref={containerRef}
      className="mermaid flex justify-center my-8 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none w-full animate-fade-in-up stagger-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const isMermaid = language === "mermaid";

            if (!inline && isMermaid) {
              return <Mermaid chart={String(children).replace(/\n$/, "")} />;
            }

            if (!inline && match) {
              return (
                <div className="relative group my-6">
                  <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs uppercase font-bold text-[var(--color-text-muted)]">
                      {language}
                    </span>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={language}
                    PreTag="div"
                    className="rounded-xl border border-[var(--color-code-border)] !bg-[var(--color-code-bg)] !m-0 !p-5"
                    showLineNumbers={false}
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-8">
              <table className="w-full text-sm text-left" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="px-6 py-3 bg-[var(--color-bg-card)] text-[var(--color-text-accent)] font-semibold border-b border-[var(--color-border)] uppercase tracking-wider" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-6 py-4 border-b border-[var(--color-border)] text-[var(--color-text-secondary)]" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-[var(--color-accent-light)] hover:text-[var(--color-gradient-end)] underline underline-offset-4 transition-colors" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
