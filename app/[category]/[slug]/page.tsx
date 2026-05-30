import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticle, getAllArticleParams, categoryDisplayNames } from "@/lib/mdParser";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface PageProps {
  params: Promise<{
    category: string;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return getAllArticleParams();
}

export async function generateMetadata({ params }: PageProps) {
  const { category, slug } = await params;
  const article = await getArticle(category, slug);

  if (!article) {
    return { title: "Not Found" };
  }

  return {
    title: `${article.title} | ${categoryDisplayNames[category] || category}`,
    description: `Learn about ${article.title} in our comprehensive CS knowledge base.`,
    keywords: article.tags.join(", "),
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { category, slug } = await params;
  const article = await getArticle(category, slug);

  if (!article) {
    notFound();
  }

  const categoryName = categoryDisplayNames[category] || category;

  const difficultyColors: Record<string, string> = {
    beginner: "bg-[var(--color-beginner)]/10 text-[var(--color-beginner)] border-[var(--color-beginner)]/20",
    intermediate: "bg-[var(--color-intermediate)]/10 text-[var(--color-intermediate)] border-[var(--color-intermediate)]/20",
    advanced: "bg-[var(--color-advanced)]/10 text-[var(--color-advanced)] border-[var(--color-advanced)]/20",
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium text-sm">Back to Hub</span>
          </Link>
          <div className="text-sm font-medium text-[var(--color-text-muted)]">
            {categoryName}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Article Header */}
        <header className="mb-12 border-b border-[var(--color-border)] pb-8">
          <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-in-up stagger-1">
            <Link
              href={`/${category}`}
              className="px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-accent)] hover:border-[var(--color-border-accent)] transition-colors"
            >
              {categoryName}
            </Link>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${
                difficultyColors[article.difficulty]
              }`}
            >
              {article.difficulty.charAt(0).toUpperCase() + article.difficulty.slice(1)}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)] mb-6 animate-fade-in-up stagger-2">
            {article.title}
          </h1>

          <div className="flex flex-wrap gap-2 animate-fade-in-up stagger-3">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--color-tag-bg)] text-[var(--color-tag-text)] border border-[var(--color-tag-border)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </header>

        {/* Article Content */}
        <article className="min-h-[50vh]">
          <MarkdownRenderer content={article.rawContent} />
        </article>

        {/* Footer / Next Steps */}
        <footer className="mt-20 pt-8 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[var(--color-text-muted)] text-sm">
            End of {article.title}. Keep exploring {categoryName}.
          </p>
          <a href="#" className="px-4 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)] transition-all text-sm font-medium flex items-center gap-2">
            Back to top
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </a>
        </footer>
      </main>
    </div>
  );
}
