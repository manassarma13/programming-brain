import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCategories,
  getAllArticlesInCategory,
  categoryDisplayNames,
  categoryDescriptions,
  categoryIcons,
} from "@/lib/mdParser";

interface PageProps {
  params: Promise<{
    category: string;
  }>;
}

export async function generateStaticParams() {
  const categories = getCategories();
  return categories.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps) {
  const { category } = await params;
  const categories = getCategories();

  if (!categories.includes(category)) {
    return { title: "Category Not Found" };
  }

  const name = categoryDisplayNames[category] || category;
  return {
    title: `${name} | Programming Brain`,
    description: categoryDescriptions[category] || `Explore our ${name} articles.`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const categories = getCategories();

  if (!categories.includes(category)) {
    notFound();
  }

  const articles = getAllArticlesInCategory(category);
  const name = categoryDisplayNames[category] || category;
  const description = categoryDescriptions[category] || "";
  const icon = categoryIcons[category] || "📚";

  const difficultyColors: Record<string, string> = {
    beginner: "bg-[var(--color-beginner)]/10 text-[var(--color-beginner)] border border-[var(--color-beginner)]/20",
    intermediate: "bg-[var(--color-intermediate)]/10 text-[var(--color-intermediate)] border border-[var(--color-intermediate)]/20",
    advanced: "bg-[var(--color-advanced)]/10 text-[var(--color-advanced)] border border-[var(--color-advanced)]/20",
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium text-sm">Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 md:py-20">
        <div className="mb-12 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{icon}</span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              {name}
            </h1>
          </div>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl">
            {description}
          </p>
        </div>

        <div className="grid gap-4">
          {articles.map((article, idx) => (
            <Link
              key={article.slug}
              href={`/${category}/${article.slug}`}
              className={`block p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-accent)] transition-all duration-200 animate-fade-in-up stagger-${(idx % 6) + 1} group`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-text-accent)] transition-colors mb-2">
                    {article.title}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {article.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--color-tag-bg)] text-[var(--color-tag-text)] border border-[var(--color-tag-border)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-md text-xs font-medium ${
                      difficultyColors[article.difficulty]
                    }`}
                  >
                    {article.difficulty.charAt(0).toUpperCase() + article.difficulty.slice(1)}
                  </span>
                  <svg
                    className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-accent)] transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
