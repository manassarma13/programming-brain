import Link from "next/link";
import {
  getCategories,
  getAllArticlesInCategory,
  categoryDisplayNames,
  categoryDescriptions,
  categoryIcons,
} from "@/lib/mdParser";

const difficultyColors: Record<string, string> = {
  beginner:
    "bg-[var(--color-beginner)]/10 text-[var(--color-beginner)] border border-[var(--color-beginner)]/20",
  intermediate:
    "bg-[var(--color-intermediate)]/10 text-[var(--color-intermediate)] border border-[var(--color-intermediate)]/20",
  advanced: "bg-[var(--color-advanced)]/10 text-[var(--color-advanced)] border border-[var(--color-advanced)]/20",
};

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
              Code Atlas
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
            <div
              key={category.slug}
              className={`group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden hover:border-[var(--color-border-accent)] transition-all duration-300 animate-fade-in-up stagger-${idx + 1}`}
            >
              {/* Category header */}
              <div className="p-6 md:p-8 border-b border-[var(--color-border)]">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/${category.slug}`}
                      className="flex items-center gap-3 group/link"
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
                  <span className="hidden md:inline-flex items-center px-3 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
                    {category.articles.length}{" "}
                    {category.articles.length === 1 ? "article" : "articles"}
                  </span>
                </div>
              </div>

              {/* Articles list */}
              <div className="divide-y divide-[var(--color-border)]">
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
