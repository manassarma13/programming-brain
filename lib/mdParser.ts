import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import remarkGfm from "remark-gfm";

const contentDirectory = path.join(process.cwd(), "content");

export interface ArticleFrontmatter {
  title: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  order?: number;
}

export interface ArticleMeta extends ArticleFrontmatter {
  slug: string;
  categorySlug: string;
}

export interface Article extends ArticleMeta {
  contentHtml: string;
  rawContent: string;
}

/**
 * Get all category directories from /content
 */
export function getCategories(): string[] {
  return fs
    .readdirSync(contentDirectory, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

/**
 * Category display names mapping
 */
export const categoryDisplayNames: Record<string, string> = {
  dsa: "Data Structures & Algorithms",
  "design-patterns": "Design Patterns",
  "operating-systems": "Operating Systems",
  "system-design": "System Design (HLD)",
  lld: "Low-Level Design (LLD)",
  frontend: "Frontend Fundamentals",
  backend: "Backend Engineering",
  languages: "Languages & Runtimes",
};

/**
 * Category descriptions for the landing page
 */
export const categoryDescriptions: Record<string, string> = {
  dsa: "Arrays, Trees, Graphs, DP, Sorting — master the building blocks of efficient software.",
  "design-patterns":
    "Creational, Structural, and Behavioral patterns that shape clean architectures.",
  "operating-systems":
    "Processes, Threads, Concurrency, Memory Management — how the machine really works.",
  "system-design":
    "Microservices, Caching, Sharding, CAP Theorem — architect systems at scale.",
  lld: "SOLID, DRY, API Design, UML — craft maintainable, elegant code.",
  frontend:
    "Browser internals, JavaScript engine, call stack, event loop, Browser APIs, CSS, performance & security — everything the browser does under the hood.",
  backend:
    "Node.js server architecture, Phoenix LiveView, Rails Hotwire, real-time systems — the server-side perspective.",
  languages:
    "Language speed benchmarks, choosing the right tool, idioms and best practices across Go, Rust, Elixir, Ruby, Python, and more.",
};

/**
 * Category icons (emoji) for visual flair
 */
export const categoryIcons: Record<string, string> = {
  dsa: "🧮",
  "design-patterns": "🏗️",
  "operating-systems": "⚙️",
  "system-design": "🌐",
  lld: "📐",
  frontend: "🖥️",
  backend: "🔧",
  languages: "⚡",
};

/**
 * Get all article slugs within a given category
 */
export function getArticleSlugs(category: string): string[] {
  const categoryPath = path.join(contentDirectory, category);
  if (!fs.existsSync(categoryPath)) return [];

  return fs
    .readdirSync(categoryPath)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

/**
 * Get article metadata (frontmatter only) — fast for listing
 */
export function getArticleMeta(
  category: string,
  slug: string
): ArticleMeta | null {
  const filePath = path.join(contentDirectory, category, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data } = matter(fileContents);

  return {
    ...(data as ArticleFrontmatter),
    slug,
    categorySlug: category,
  };
}

/**
 * Get full article content with parsed HTML
 */
export async function getArticle(
  category: string,
  slug: string
): Promise<Article | null> {
  const filePath = path.join(contentDirectory, category, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);

  const processedContent = await remark()
    .use(remarkGfm)
    .use(html, { sanitize: false })
    .process(content);

  return {
    ...(data as ArticleFrontmatter),
    slug,
    categorySlug: category,
    contentHtml: processedContent.toString(),
    rawContent: content,
  };
}

/**
 * Get all articles for a given category
 */
export function getAllArticlesInCategory(category: string): ArticleMeta[] {
  const slugs = getArticleSlugs(category);
  const articles = slugs
    .map((slug) => getArticleMeta(category, slug))
    .filter((a): a is ArticleMeta => a !== null);

  // Sort by order field if present, then alphabetically
  return articles.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined)
      return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Get all articles across all categories
 */
export function getAllArticles(): ArticleMeta[] {
  const categories = getCategories();
  return categories.flatMap((cat) => getAllArticlesInCategory(cat));
}

/**
 * Generate all static params for [category]/[slug] routes
 */
export function getAllArticleParams(): { category: string; slug: string }[] {
  const categories = getCategories();
  return categories.flatMap((category) =>
    getArticleSlugs(category).map((slug) => ({ category, slug }))
  );
}
