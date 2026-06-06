import Link from "next/link";
import CategoryCard from "@/components/CategoryCard";
import {
  getCategories,
  getAllArticlesInCategory,
  categoryDisplayNames,
  categoryDescriptions,
  categoryIcons,
} from "@/lib/mdParser";


export default function HomePage() {
  const categories = getCategories();

  const categoryData = categories.map((cat) => ({
    slug: cat,
    name: categoryDisplayNames[cat] ?? cat,
    description: categoryDescriptions[cat] ?? "",
    icon: categoryIcons[cat] ?? "📚",
    articles: getAllArticlesInCategory(cat),
  }));

  const totalArticles = categoryData.reduce(
    (sum, c) => sum + c.articles.length,
    0
  );

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-elevated)]/40 via-[var(--color-bg-primary)] to-[var(--color-bg-elevated)]/30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[var(--color-accent)]/10 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-[var(--spacing-page)] py-24 md:py-32 text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-accent-glow)] border border-[var(--color-border-accent)] text-sm text-[var(--color-text-accent)] mb-6">
              <span className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-pulse" />
              {totalArticles} articles across {categories.length} domains
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in-up stagger-1">
            <span className="bg-gradient-to-r from-[var(--color-gradient-start)] via-[var(--color-gradient-mid)] to-[var(--color-gradient-end)] bg-clip-text text-transparent">
              Programming Brain
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-8 animate-fade-in-up stagger-2">
            A curated knowledge base for software engineers — covering
            algorithms, system design, design patterns, and everything in
            between.
          </p>

          <div className="flex flex-wrap justify-center gap-3 animate-fade-in-up stagger-3">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/${cat}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)] hover:bg-[var(--color-bg-card-hover)] transition-all duration-200"
              >
                {categoryIcons[cat]} {categoryDisplayNames[cat]}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Category Cards */}
      <section className="max-w-6xl mx-auto px-[var(--spacing-page)] py-16 md:py-24">
        <div className="grid gap-8">
          {categoryData.map((category, idx) => (
            <CategoryCard key={category.slug} category={category} idx={idx} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-8">
        <div className="max-w-6xl mx-auto px-[var(--spacing-page)] text-center text-sm text-[var(--color-text-muted)]">
          Built with Next.js · Content rendered from Markdown · Open for
          contributions
        </div>
      </footer>
    </main>
  );
}
