---
title: "Performance & Core Web Vitals"
category: "Frontend Fundamentals"
difficulty: "advanced"
tags: ["LCP", "CLS", "INP", "performance", "code-splitting", "lazy-loading", "caching", "tree-shaking", "resource-hints"]
order: 13
---

# Performance & Core Web Vitals

Google's **Core Web Vitals** are the canonical set of performance metrics that directly affect user experience and SEO rankings. Every frontend engineer should be able to measure, diagnose, and optimise these.

---

## The Three Core Web Vitals

| Metric | Measures | Good | Needs Improvement | Poor |
|---|---|---|---|---|
| **LCP** — Largest Contentful Paint | Loading performance | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **CLS** — Cumulative Layout Shift | Visual stability | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| **INP** — Interaction to Next Paint | Interactivity | ≤ 200ms | ≤ 500ms | > 500ms |

> INP replaced FID (First Input Delay) in March 2024. It measures the latency of ALL interactions, not just the first one.

---

## LCP — Largest Contentful Paint

LCP measures when the **largest visible content element** finishes rendering. Typically a hero image, `<h1>`, or above-the-fold block.

### Common LCP Elements
- `<img>` (including `<image>` in SVG)
- `<video>` poster image
- Elements with CSS `background-image`
- Block-level elements with text

### Root Causes & Fixes

| Root Cause | Fix |
|---|---|
| Slow server (high TTFB) | CDN, server-side caching, HTTP/2 push |
| Render-blocking CSS/JS | `defer`, `async`, inline critical CSS |
| LCP image not preloaded | `<link rel="preload" as="image">` |
| LCP image is lazy-loaded | Remove `loading="lazy"` from hero image |
| Unoptimised image | WebP/AVIF, correct dimensions, `srcset` |

```html
<!-- ✅ Preload hero image -->
<link rel="preload" as="image" href="/hero.webp"
      imagesrcset="/hero-400.webp 400w, /hero-800.webp 800w"
      imagesizes="100vw"
      fetchpriority="high">

<!-- ✅ Responsive image with modern format -->
<picture>
  <source srcset="/hero.avif" type="image/avif">
  <source srcset="/hero.webp" type="image/webp">
  <img src="/hero.jpg" alt="Hero" width="800" height="400"
       fetchpriority="high">  <!-- No loading="lazy" on LCP image! -->
</picture>
```

---

## CLS — Cumulative Layout Shift

CLS measures unexpected layout shifts — elements moving around as the page loads, causing users to click the wrong thing.

### Layout Shift Score
```
CLS = impact fraction × distance fraction
```

A 50% viewport element that shifts 25% of viewport height = 0.5 × 0.25 = 0.125 (poor threshold).

### Common Causes & Fixes

| Cause | Fix |
|---|---|
| Images without dimensions | Always set `width` + `height` attributes |
| Web fonts causing FOUT | `font-display: optional` or preload fonts |
| Dynamically injected content | Reserve space with min-height or skeleton |
| Ads/embeds without reserved space | Fixed height containers |
| Animations that change layout | Use `transform` instead of `top/left` |

```css
/* ✅ Reserve space for images — browser maintains aspect ratio */
img {
  width: 100%;
  height: auto; /* or aspect-ratio: 16 / 9 */
}

/* ✅ Skeleton loader prevents layout shift */
.card-placeholder {
  min-height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## INP — Interaction to Next Paint

INP measures the time from **user interaction** (click, keypress, tap) to when the browser actually paints the response. It covers ALL interactions, taking the 98th percentile.

### Why Is INP High?

1. **Long tasks** on the main thread (> 50ms) block the browser from painting
2. **Too much JS** in event handlers
3. **Synchronous style recalculation** during interaction
4. **Input handler doing heavy DOM work**

### Fixes

```javascript
// ❌ Blocking interaction handler
button.addEventListener('click', () => {
  expensiveOperation(); // blocks paint for 200ms
  updateUI();
});

// ✅ Yield to browser before heavy work
button.addEventListener('click', async () => {
  updateUI(); // instant feedback first
  await scheduler.yield(); // yield to browser to paint
  expensiveOperation(); // then do heavy work
});

// ✅ Use isInputPending to yield smartly
async function processQueue(queue) {
  for (const item of queue) {
    if (navigator.scheduling?.isInputPending()) {
      await scheduler.yield(); // yield if user is interacting
    }
    process(item);
  }
}
```

---

## Resource Hints

Tell the browser about resources it will need:

```html
<!-- dns-prefetch: resolve DNS early (free) -->
<link rel="dns-prefetch" href="//fonts.googleapis.com">

<!-- preconnect: DNS + TCP + TLS (use for critical origins) -->
<link rel="preconnect" href="https://fonts.googleapis.com">

<!-- preload: fetch a specific resource at high priority -->
<link rel="preload" as="font" href="/inter.woff2" type="font/woff2" crossorigin>
<link rel="preload" as="script" href="/critical.js">
<link rel="preload" as="image" href="/hero.webp">
<link rel="preload" as="style" href="/critical.css">

<!-- prefetch: fetch for future navigation (low priority) -->
<link rel="prefetch" href="/next-page.js">

<!-- modulepreload: preload ES modules (parses too) -->
<link rel="modulepreload" href="/app.js">
```

### Fetch Priority API

```html
<!-- Boost or reduce fetch priority -->
<img src="/hero.jpg" fetchpriority="high">   <!-- default is auto -->
<img src="/below-fold.jpg" fetchpriority="low">
<script src="/analytics.js" fetchpriority="low"></script>
```

---

## Code Splitting

Don't ship code the user doesn't need immediately. Bundle tools (Vite, webpack) support splitting.

### Dynamic Import (Route-based splitting)

```javascript
// React (lazy loading routes)
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));
const Settings  = lazy(() => import('./Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings"  element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### Component-level splitting

```javascript
// Load heavy component only when needed
async function loadChartLibrary() {
  const { Chart } = await import('chart.js');
  return Chart;
}

button.addEventListener('click', async () => {
  const Chart = await loadChartLibrary();
  new Chart(canvas, config);
});
```

---

## Tree Shaking

Tree shaking removes dead code (unused exports) at build time. Requires ESM (not CommonJS):

```javascript
// ✅ Named exports — tree-shakeable
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }

// Only `add` used — `subtract` is eliminated from bundle
import { add } from './math.js';

// ❌ Barrel files can break tree-shaking
import { everything } from './index.js'; // may pull in unused code

// ✅ Import directly from source
import { add } from './math/add.js';
```

Mark packages as side-effect free in `package.json`:
```json
{ "sideEffects": false }
// Or specify files WITH side effects:
{ "sideEffects": ["./src/polyfills.js"] }
```

---

## Image Optimisation

```html
<!-- Modern formats -->
<picture>
  <source srcset="img.avif" type="image/avif"> <!-- ~50% smaller than JPEG -->
  <source srcset="img.webp" type="image/webp"> <!-- ~30% smaller than JPEG -->
  <img src="img.jpg" alt="Description" width="800" height="600">
</picture>

<!-- Responsive images -->
<img
  srcset="img-400.webp 400w, img-800.webp 800w, img-1200.webp 1200w"
  sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 400px"
  src="img-800.webp"
  alt="Description">

<!-- Lazy loading (below the fold) -->
<img src="below-fold.jpg" loading="lazy" decoding="async">
```

---

## Caching Strategies

### HTTP Cache Headers

```
Cache-Control: max-age=31536000, immutable  → Static assets with hashed filenames
Cache-Control: no-cache                      → Revalidate every time (stale-while-revalidate pattern)
Cache-Control: no-store                      → Never cache (sensitive data)
Cache-Control: stale-while-revalidate=86400 → Serve stale immediately, refresh in background
ETag: "abc123"                              → Conditional requests
```

### Service Worker Cache Strategies

| Strategy | Pattern | Use case |
|---|---|---|
| Cache First | Cache → Network (fallback) | Static assets |
| Network First | Network → Cache (fallback) | API responses |
| Stale While Revalidate | Cache (immediately) + Network (background) | Non-critical data |
| Cache Only | Cache only | Offline content |
| Network Only | Network only | Real-time data |

---

## Measuring Performance

```javascript
// Web Vitals library (simplest)
import { onLCP, onCLS, onINP } from 'web-vitals';

onLCP(console.log);
onCLS(console.log);
onINP(console.log);

// Performance Observer (raw API)
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.name, entry.startTime, entry.duration);
  }
}).observe({ entryTypes: ['largest-contentful-paint', 'layout-shift', 'event'] });

// Long task detection
new PerformanceObserver((list) => {
  for (const task of list.getEntries()) {
    if (task.duration > 50) {
      console.warn('Long task:', task.duration + 'ms', task);
    }
  }
}).observe({ entryTypes: ['longtask'] });

// Navigation timing
const [nav] = performance.getEntriesByType('navigation');
console.table({
  TTFB: nav.responseStart - nav.requestStart,
  domParsed: nav.domInteractive - nav.responseEnd,
  fullyLoaded: nav.loadEventEnd - nav.startTime,
});
```

---

## Bundle Analysis

```bash
# Vite
npx vite-bundle-visualizer

# webpack
npx webpack-bundle-analyzer stats.json

# Next.js
ANALYZE=true next build
```

---

## Performance Budget

Set budgets and fail the build if exceeded:

```json
// In bundler config (e.g., Vite / webpack)
{
  "performance": {
    "maxEntrypointSize": 250000,  // 250KB
    "maxAssetSize": 200000,
    "hints": "error"
  }
}
```

Lighthouse CI can enforce performance budgets in CI/CD:
```yaml
# .lighthouserc.js
module.exports = {
  assert: {
    assertions: {
      'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      'cumulative-layout-shift':  ['error', { maxNumericValue: 0.1 }],
      'interaction-to-next-paint': ['warn', { maxNumericValue: 200 }],
    }
  }
};
```
