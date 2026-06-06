---
title: "CSS Advanced"
category: "Frontend Fundamentals"
difficulty: "advanced"
tags: ["stacking-context", "contain", "content-visibility", "CSS-Houdini", "scroll-driven-animations", "paint-worklet", "layer", "logical-properties"]
order: 10
---

# CSS Advanced

Beyond the basics lies a layer of CSS that most engineers never explore — yet it's where the real control lives. These concepts underpin every framework, design system, and performance-optimised site.

---

## Stacking Contexts

A **stacking context** is an independent 3D rendering layer. Elements inside a stacking context are painted as a unit, and `z-index` only works *within the same stacking context*.

### What creates a stacking context?

| Property | Value that triggers |
|---|---|
| `position` | Any value except `static`, with `z-index` set |
| `opacity` | < 1 |
| `transform` | Any value except `none` |
| `filter` | Any value except `none` |
| `will-change` | Any animatable property |
| `isolation` | `isolate` |
| `mix-blend-mode` | Any value except `normal` |
| `contain` | `layout`, `paint` |
| `clip-path`, `mask` | Any value except `none` |

```css
/* Classic z-index confusion */
.parent { position: relative; z-index: 1; } /* creates stacking context */
.child  { position: absolute; z-index: 9999; } /* stuck inside parent's context */
.sibling { position: relative; z-index: 2; } /* appears above BOTH */

/* Fix: isolate a subtree's stacking context */
.scoped-component {
  isolation: isolate; /* creates context without affecting layout */
}
```

---

## CSS Containment

`contain` tells the browser that an element is **independent** from the rest of the page, allowing rendering optimisations:

```css
.card {
  contain: layout paint; /* layout changes inside don't affect outside */
}

.widget {
  contain: strict; /* layout + paint + size — strongest isolation */
}
```

| Value | What it isolates |
|---|---|
| `size` | Element size is independent of its children |
| `layout` | Internal layout doesn't affect external elements |
| `paint` | Children clipped to element's box; offscreen not painted |
| `style` | CSS counters/quotes don't escape the element |
| `content` | `layout` + `paint` + `style` |
| `strict` | All of the above |

Use `contain: layout paint` on component roots to dramatically speed up layout recalculations.

---

## content-visibility

`content-visibility: auto` skips rendering of off-screen content entirely — one of the highest-impact CSS performance properties:

```css
.article {
  content-visibility: auto;
  /* Hint the browser about the element's expected size to prevent layout shift */
  contain-intrinsic-size: auto 500px;
}
```

The browser will skip style calculation, layout, and paint for elements with `content-visibility: auto` that are off-screen. When they scroll into view, they render. Google reports up to **7× rendering time improvements** on long content pages.

---

## CSS Logical Properties

Logical properties adapt to writing mode (LTR, RTL, vertical text) instead of hardcoding physical directions:

| Physical | Logical |
|---|---|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `margin-top` | `margin-block-start` |
| `padding-left / right` | `padding-inline` |
| `padding-top / bottom` | `padding-block` |
| `width` | `inline-size` |
| `height` | `block-size` |
| `top`, `left` | `inset-block-start`, `inset-inline-start` |
| `border-top` | `border-block-start` |

```css
.container {
  /* Physical — breaks in RTL layouts */
  margin-left: auto;
  margin-right: auto;

  /* Logical — works in any writing mode */
  margin-inline: auto;
  padding-block: 2rem;
  max-inline-size: 1280px;
}
```

---

## Cascade Layers (`@layer`)

Cascade layers give you explicit control over the cascade order — preventing specificity wars:

```css
/* Declare layers in order (lower = lower priority) */
@layer reset, base, components, utilities;

@layer reset {
  * { margin: 0; padding: 0; }
}

@layer base {
  h1 { font-size: 2rem; color: navy; }
}

@layer components {
  .card { padding: 1rem; background: white; }
}

@layer utilities {
  .mt-auto { margin-top: auto; }
}

/* Unlayered styles beat ALL layers regardless of specificity */
h1 { color: red !important; } /* ← overrides everything */
```

Rules in later layers beat earlier layers, regardless of specificity. This is especially useful when importing third-party CSS:

```css
@import url('bootstrap.css') layer(bootstrap);

@layer bootstrap, custom; /* custom always wins over bootstrap */
```

---

## CSS Custom Properties — Advanced

```css
/* Typed custom properties with @property */
@property --rotation {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

/* Now you can animate it! (non-@property vars can't be animated) */
@keyframes spin {
  to { --rotation: 360deg; }
}

.spinner {
  animation: spin 2s linear infinite;
  transform: rotate(var(--rotation));
}
```

```css
/* Custom properties in calc() */
:root {
  --base-spacing: 4px;
}

.element {
  padding: calc(var(--base-spacing) * 4); /* 16px */
  margin-top: calc(var(--base-spacing) * 8); /* 32px */
}
```

### Environment Variables

```css
/* Safe areas for notched devices */
padding-bottom: env(safe-area-inset-bottom);
padding-top: env(safe-area-inset-top);
```

---

## Scroll-Driven Animations

Animate elements based on scroll position — no JavaScript:

```css
/* Link animation to scroll position */
@keyframes reveal {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.card {
  animation: reveal linear;
  animation-timeline: view();   /* tied to element's intersection with viewport */
  animation-range: entry 0% entry 30%; /* play during entry phase */
}

/* Progress bar tied to page scroll */
.progress-bar {
  animation: grow-bar linear;
  animation-timeline: scroll(root block); /* scroll of root on block axis */
  animation-fill-mode: both;
}
@keyframes grow-bar {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
```

```css
/* Named timelines for complex scenarios */
.container {
  scroll-timeline-name: --my-scroll;
  scroll-timeline-axis: block;
}
.child {
  animation-timeline: --my-scroll;
}
```

---

## View Transitions API

Animate between page states (or full page navigations in SPAs) with CSS:

```javascript
// Trigger a view transition
document.startViewTransition(() => {
  // DOM mutation happens here
  updateContent();
});
```

```css
/* Default: cross-fade. Customise with pseudo-elements */
::view-transition-old(root) {
  animation: slide-out 0.3s ease forwards;
}
::view-transition-new(root) {
  animation: slide-in 0.3s ease forwards;
}

/* Named view transitions for individual elements */
.hero-image {
  view-transition-name: hero;
}
/* The hero will animate independently (morphing between pages) */
```

---

## CSS Houdini

CSS Houdini exposes browser rendering internals to JavaScript — letting you extend CSS itself.

### Paint API (CSS Paint Worklet)

```javascript
// my-painter.js (loaded as a worklet)
class CheckerboardPainter {
  static get inputProperties() { return ['--checkerboard-size']; }

  paint(ctx, size, props) {
    const tileSize = parseInt(props.get('--checkerboard-size')) || 20;

    for (let y = 0; y < size.height; y += tileSize) {
      for (let x = 0; x < size.width; x += tileSize) {
        ctx.fillStyle = ((x + y) / tileSize) % 2 === 0 ? '#fff' : '#eee';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  }
}

registerPaint('checkerboard', CheckerboardPainter);
```

```javascript
// main.js
CSS.paintWorklet.addModule('./my-painter.js');
```

```css
.element {
  --checkerboard-size: 30;
  background: paint(checkerboard);
}
```

### Layout API (experimental)

Define custom layout algorithms (like `display: masonry` before it's native):

```javascript
registerLayout('masonry', class {
  async layout(children, edges, constraints, styleMap) {
    // Custom layout algorithm
  }
});
```

---

## Container Queries (Advanced Usage)

```css
/* Style queries — query computed style values */
@container style(--variant: primary) {
  .button { background: blue; }
}

/* Size queries with different container types */
.sidebar { container-type: inline-size; }
.widget  { container-type: size; } /* both dimensions queryable */

/* Named containers */
.card-grid {
  container: card-grid / inline-size;
}

@container card-grid (width > 600px) {
  .card { grid-template-columns: 1fr 1fr; }
}
```

---

## The `:has()` Selector — "Parent Selector"

Select elements based on their **descendants** — a long-requested feature finally in all modern browsers:

```css
/* Form with an error */
.form:has(.error) { border: 2px solid red; }

/* Card with an image */
.card:has(> img) { padding-top: 0; }

/* Input that's focused */
label:has(+ input:focus) { color: blue; font-weight: bold; }

/* nth-child based on sibling count — count siblings */
li:has(~ li:nth-last-child(1)):first-child {
  /* first child when there are exactly 2 items */
}

/* Dark mode class on :root */
:root:has(.dark-mode-toggle:checked) {
  --bg: #0f172a;
  --fg: #f8fafc;
}
```

---

## `@scope` — CSS Scoping

Restrict styles to a specific subtree without classes or increased specificity:

```css
@scope (.card) {
  /* Only applies inside .card elements */
  h2 { font-size: 1.25rem; }
  p  { color: #666; }
}

/* Scope with lower boundary — exclude nested cards */
@scope (.card) to (.card .card) {
  h2 { color: navy; }
}
```

---

## CSS Nesting (Native)

```css
/* Now supported natively (no preprocessor needed) */
.card {
  padding: 1rem;
  background: white;

  &:hover {
    background: #f8fafc;
  }

  & .title {
    font-size: 1.25rem;
    font-weight: 700;
  }

  @media (min-width: 768px) {
    padding: 2rem;
  }

  @container (width > 400px) {
    flex-direction: row;
  }
}
```

---

## Performance — CSS Properties by Rendering Cost

| Property | Triggers | Cost |
|---|---|---|
| `transform`, `opacity` | Composite only | 🟢 Cheapest |
| `filter` (most) | Paint + Composite | 🟡 Medium |
| `color`, `background` | Paint | 🟡 Medium |
| `width`, `height`, `margin` | Layout + Paint + Composite | 🔴 Expensive |
| `font-size` on parent | Layout subtree | 🔴 Expensive |

```css
/* ✅ Animate on compositor — no layout or paint */
.drawer { transition: transform 0.3s ease; }
.drawer.open { transform: translateX(0); }
.drawer.closed { transform: translateX(-100%); }

/* ❌ Animate layout properties — triggers full reflow */
.drawer { transition: left 0.3s ease; }
.drawer.open { left: 0; }
```

Always use **`will-change: transform`** before complex animations — promotes element to its own GPU layer:

```css
.animated-element {
  will-change: transform; /* hint to browser before animation starts */
}
/* Remove will-change after animation — it's not free */
```
