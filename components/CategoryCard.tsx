"use client";

import { useState } from "react";
import Link from "next/link";

interface Article {
  slug: string;
  title: string;
  tags: string[];
  difficulty: string;
}

interface Category {
  slug: string;
  name: string;
  description: string;
  icon: string;
  articles: Article[];
}

interface Props {
  category: Category;
  idx: number;
}

const difficultyColors: Record<string, string> = {
  beginner:
    "bg-[var(--color-beginner)]/10 text-[var(--color-beginner)] border border-[var(--color-beginner)]/20",
  intermediate:
    "bg-[var(--color-intermediate)]/10 text-[var(--color-intermediate)] border border-[var(--color-intermediate)]/20",
  advanced: "bg-[var(--color-advanced)]/10 text-[var(--color-advanced)] border border-[var(--color-advanced)]/20",
};

export default function CategoryCard({ category, idx }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden hover:border-[var(--color-border-accent)] transition-all duration-300 animate-fade-in-up stagger-${idx + 1}`}
    >
      {/* Category header */}
      <div 
        className="p-6 md:p-8 border-b border-[var(--color-border)] flex flex-col md:flex-row items-start justify-between cursor-pointer group/header hover:bg-[var(--color-bg-card)] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 mb-4 md:mb-0">
          <Link
            href={`/${category.slug}`}
            className="flex items-center gap-3 group/link w-fit"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-3xl">{category.icon}</span>
            <h2 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] group-hover/link:text-[var(--color-text-accent)] transition-colors">
              {category.name}
            </h2>
          </Link>
          <p className="mt-2 text-[var(--color-text-secondary)] text-sm md:text-base max-w-xl">
            {category.description}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="hidden md:inline-flex items-center px-3 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
            {category.articles.length}{" "}
            {category.articles.length === 1 ? "article" : "articles"}
          </span>
          <button
            className="text-[var(--color-text-muted)] group-hover/header:text-[var(--color-text-accent)] transition-colors p-2 rounded-full hover:bg-[var(--color-bg-secondary)]"
            aria-label="Toggle section"
          >
            <svg
              className={`w-6 h-6 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Articles list */}
      <div
        className={`divide-y divide-[var(--color-border)] transition-[max-height,opacity] duration-500 ease-in-out origin-top overflow-hidden ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 border-t-0"
        }`}
      >
        {category.articles.map((article) => (
          <Link
            key={article.slug}
            href={`/${category.slug}/${article.slug}`}
            className="flex items-center justify-between p-4 md:px-8 md:py-5 hover:bg-[var(--color-bg-card)] transition-colors duration-150 group/article"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--color-text-primary)] group-hover/article:text-[var(--color-text-accent)] transition-colors truncate">
                {article.title}
              </h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {article.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md text-xs bg-[var(--color-tag-bg)] text-[var(--color-tag-text)] border border-[var(--color-tag-border)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4 shrink-0">
              <span
                className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  difficultyColors[article.difficulty] ?? ""
                }`}
              >
                {article.difficulty}
              </span>
              <svg
                className="w-4 h-4 text-[var(--color-text-muted)] group-hover/article:text-[var(--color-text-accent)] transition-transform group-hover/article:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
