---
title: "Critical Rendering Path"
category: "Frontend Fundamentals"
difficulty: "beginner"
tags: ["CRP", "DOM", "CSSOM", "reflow", "repaint", "layout", "paint", "composite"]
order: 2
---

# Critical Rendering Path (CRP)

The **Critical Rendering Path** is the sequence of steps a browser performs to convert HTML, CSS, and JavaScript into actual pixels on screen. Optimising the CRP is one of the highest-leverage performance improvements you can make.

---

## The Six Stages

```
HTML bytes
   │
   ▼
1. DOM Construction
   │
CSS bytes
   │
   ▼
2. CSSOM Construction
   │
   ▼
3. Render Tree Construction (DOM + CSSOM)
   │
   ▼
4. Layout (Reflow)
   │
   ▼
5. Paint
   │
   ▼
6. Compositing
```

---

## 1. DOM Construction

The HTML parser tokenises the byte stream and builds the **Document Object Model (DOM)** — a tree of nodes.

```html
<html>
  <body>
    <h1>Hello</h1>
    <p>World</p>
  </body>
</html>
```

Produces:
```
Document
  └── html
        └── body
              ├── h1  →  "Hello"
              └── p   →  "World"
```

Key facts:
- Parsing is **incremental** — browser paints partial content progressively.
- `<script>` tags **block parsing** (unless `defer`/`async`).
- `document.readyState === 'loading'` during parse; `'interactive'` after HTML parsed; `'complete'` after all resources load.

---

## 2. CSSOM Construction

CSS bytes are parsed into the **CSS Object Model (CSSOM)** — a tree of style rules.

```css
body { font-size: 16px; }
h1   { font-size: 2em; color: navy; }
```

CSSOM is **render-blocking** — the browser will not render anything until the CSSOM is complete. This is because CSS can override earlier rules (cascade), so the browser needs the full picture before styling any element.

**Specificity** determines which rule wins when multiple rules target the same element:

| Selector type | Specificity weight |
|---|---|
| Inline style | 1-0-0-0 |
| ID `#id` | 0-1-0-0 |
| Class `.cls`, attribute `[attr]`, pseudo-class `:hover` | 0-0-1-0 |
| Element `div`, pseudo-element `::before` | 0-0-0-1 |

---

## 3. Render Tree Construction

The browser merges DOM + CSSOM to create the **Render Tree** — containing only visible elements with their computed styles.

- `display: none` → node excluded from render tree entirely
- `visibility: hidden` → node included (still takes up space) but not painted
- Pseudo-elements (`::before`, `::after`) are added to the render tree

```
Render Tree:
  html
  └── body (font-size: 16px)
        ├── h1  (font-size: 32px, color: navy)
        └── p   (font-size: 16px)
```

---

## 4. Layout (Reflow)

The browser calculates the **exact geometry** of each render tree node: position (x, y), size (width, height), relative to the viewport.

- Uses the **box model**: `content + padding + border + margin`
- The coordinate system starts at the top-left corner of the viewport
- Layout is **recursive** — a parent's size depends on its children

### What triggers layout?

| Action | Triggers layout? |
|---|---|
| Change `width`, `height`, `margin`, `padding` | ✅ Yes |
| Change `font-size` | ✅ Yes |
| Change `transform` | ❌ No (compositor only) |
| Change `opacity` | ❌ No (compositor only) |
| Read `offsetWidth`, `scrollTop` | ✅ Yes (forces synchronous layout) |

### Layout Thrashing

Reading layout properties (like `offsetWidth`) then writing styles in a loop forces the browser to recalculate layout on every iteration — **layout thrashing**:

```javascript
// ❌ Bad — layout thrash
elements.forEach(el => {
  const width = el.offsetWidth; // forces layout
  el.style.width = (width * 2) + 'px'; // invalidates layout
});

// ✅ Good — batch reads, then batch writes
const widths = elements.map(el => el.offsetWidth); // batch read
elements.forEach((el, i) => {
  el.style.width = (widths[i] * 2) + 'px'; // batch write
});
```

Or use `requestAnimationFrame` to schedule writes at the correct time.

---

## 5. Paint

The browser converts the render tree into **paint records** — a list of drawing instructions for each layer:

```
Draw background rectangle at (0,0) 1280×800 color #fff
Draw text "Hello" at (20, 60) font Arial 32px color navy
Draw text "World" at (20, 100) font Arial 16px color #333
```

Paint is done **per layer**. Elements that are composited to their own layer (via `will-change: transform` or `transform: translateZ(0)`) paint independently.

### What triggers repaint (without reflow)?

- `color`, `background-color`, `outline`, `visibility`
- Repaints are cheaper than reflows but still non-trivial

---

## 6. Compositing

The compositor thread takes the painted layers (bitmaps rasterized by raster threads) and **assembles them** on the GPU into the final screen image.

**Why compositing is the fastest path:**
- Happens entirely off the main thread
- GPU-accelerated
- Does not trigger layout or paint

Properties that stay in the compositor:
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (partial — some values force paint)

```javascript
// ❌ Triggers layout every frame
el.style.left = (x++) + 'px';

// ✅ Compositor only — silky smooth 60fps
el.style.transform = `translateX(${x++}px)`;
```

---

## Reflow vs Repaint vs Composite — Cheat Sheet

| Change | Reflow | Repaint | Composite |
|---|---|---|---|
| `width`, `height` | ✅ | ✅ | ✅ |
| `color`, `background` | ❌ | ✅ | ✅ |
| `transform`, `opacity` | ❌ | ❌ | ✅ |

Always aim to push animations to the **composite-only** path.

---

## CRP Optimisation Techniques

| Technique | Impact |
|---|---|
| Minify & compress CSS/JS | Smaller transfer size → faster parse |
| Inline critical CSS | Eliminate render-blocking request for above-the-fold styles |
| `defer` / `async` scripts | Remove JS from the critical path |
| `<link rel="preload">` | Fetch key resources early |
| `font-display: swap` | Prevent invisible text during font load |
| Code splitting | Reduce initial JS bundle size |
| `content-visibility: auto` | Skip layout/paint for off-screen content |

---

## Measuring CRP

```javascript
// Navigation Timing API
const [entry] = performance.getEntriesByType('navigation');
console.log('TTFB:', entry.responseStart - entry.requestStart);
console.log('DOM parse:', entry.domContentLoadedEventEnd - entry.responseEnd);
console.log('Full load:', entry.loadEventEnd - entry.startTime);
```

Use **Lighthouse** or **Chrome DevTools Performance tab** to visualise the waterfall and identify bottlenecks.
