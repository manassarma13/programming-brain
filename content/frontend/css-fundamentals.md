---
title: "CSS Fundamentals"
category: "Frontend Fundamentals"
difficulty: "beginner"
tags: ["CSS", "box-model", "specificity", "cascade", "flexbox", "grid", "responsive", "custom-properties"]
order: 9
---

# CSS Fundamentals

CSS controls the visual presentation of the web. Its deceptively simple syntax hides a powerful system of cascade, inheritance, and layout algorithms.

---

## The Box Model

Every element in CSS is a rectangular **box** composed of four areas:

```
┌─────────────────────────────────┐  ← margin-top
│           MARGIN                │
│  ┌───────────────────────────┐  │
│  │         BORDER            │  │
│  │  ┌─────────────────────┐  │  │
│  │  │      PADDING        │  │  │
│  │  │  ┌───────────────┐  │  │  │
│  │  │  │    CONTENT    │  │  │  │
│  │  │  └───────────────┘  │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### `box-sizing`

| Value | `width` / `height` includes |
|---|---|
| `content-box` (default) | Content only; padding + border added on top |
| `border-box` | Content + padding + border; easier to reason about |

```css
/* Best practice — apply globally */
*, *::before, *::after {
  box-sizing: border-box;
}
```

---

## The Cascade

When multiple rules target the same element, CSS resolves conflicts through the **cascade**:

1. **Origin & importance**: `!important` > author > user > browser defaults
2. **Specificity**: Which selector is more specific?
3. **Order**: Later rules win over earlier rules (same specificity)

### Specificity Calculation

```
(A, B, C, D)
 A = inline styles      (1, 0, 0, 0)
 B = ID selectors       (0, 1, 0, 0)
 C = class, attribute, pseudo-class (0, 0, 1, 0)
 D = element, pseudo-element (0, 0, 0, 1)
```

```css
/* Specificity: (0, 0, 0, 1) */
p { color: blue; }

/* Specificity: (0, 0, 1, 1) */
p.highlight { color: green; } /* wins */

/* Specificity: (0, 1, 0, 0) */
#header { color: red; } /* wins over both */
```

Use `where()` for zero-specificity selectors, `:is()` for grouped selectors:

```css
:where(h1, h2, h3) { margin: 0; } /* specificity: 0 */
:is(h1, h2, h3).hero { color: red; } /* specificity of most specific arg */
```

---

## Inheritance

Some properties inherit from parent to child by default (text-related: `color`, `font-*`, `line-height`). Others don't (`margin`, `padding`, `border`, `background`).

```css
/* Force inheritance */
.child { color: inherit; }

/* Reset to browser default */
.child { color: initial; }

/* Reset to inherited value (as if no rule existed) */
.child { color: unset; }

/* Reset all properties */
.child { all: unset; }
```

---

## Display & Formatting Contexts

| `display` value | Formatting context | Use case |
|---|---|---|
| `block` | Block formatting context | Full-width boxes, stacked vertically |
| `inline` | Inline formatting context | Text content, flows in line |
| `inline-block` | Block within inline | Sized inline elements |
| `flex` | Flex formatting context | 1D layout (row or column) |
| `grid` | Grid formatting context | 2D layout |
| `none` | Removed from layout | Hide element |
| `contents` | Element disappears, children remain | Styling wrappers |

---

## Flexbox

For **one-dimensional** layout (row OR column):

```css
.container {
  display: flex;
  flex-direction: row;           /* or column, row-reverse, column-reverse */
  justify-content: space-between; /* main axis alignment */
  align-items: center;           /* cross axis alignment */
  flex-wrap: wrap;               /* allow wrapping */
  gap: 1rem;                     /* space between items */
}

.item {
  flex: 1;                       /* flex-grow: 1, flex-shrink: 1, flex-basis: 0 */
  flex: 0 0 200px;               /* fixed 200px, no grow/shrink */
  align-self: flex-start;        /* override align-items for this item */
  order: -1;                     /* reorder visually */
}
```

### Justify-content Values

```
flex-start | flex-end | center | space-between | space-around | space-evenly
```

### Align-items Values

```
flex-start | flex-end | center | baseline | stretch
```

---

## CSS Grid

For **two-dimensional** layout:

```css
.container {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;         /* 3 columns */
  grid-template-columns: repeat(3, 1fr);       /* same */
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* responsive */
  grid-template-rows: auto 1fr auto;
  gap: 1rem 2rem;                              /* row-gap column-gap */
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "footer footer footer";
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }

/* Span multiple cells */
.wide {
  grid-column: 1 / 3;  /* from line 1 to line 3 */
  grid-row: span 2;    /* span 2 rows */
}
```

---

## Positioning

| `position` | Behaviour |
|---|---|
| `static` | Default; follows normal flow |
| `relative` | Offset from normal position; creates stacking context if `z-index` set |
| `absolute` | Removed from flow; positioned relative to nearest non-static ancestor |
| `fixed` | Like absolute but relative to viewport; stays on scroll |
| `sticky` | Normal flow until threshold, then fixed-like |

```css
.parent { position: relative; }
.child {
  position: absolute;
  top: 0; right: 0;  /* anchored to parent's top-right corner */
}

.sticky-header {
  position: sticky;
  top: 0;     /* sticks when it reaches 0px from viewport top */
  z-index: 10;
}
```

---

## Custom Properties (CSS Variables)

```css
:root {
  --color-primary: #6366f1;
  --spacing-md: 1rem;
  --radius: 8px;
}

.button {
  background: var(--color-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius);
  /* Fallback value */
  color: var(--text-color, #ffffff);
}

/* Override in a scope */
.dark-theme {
  --color-primary: #818cf8;
}

/* Update via JavaScript */
document.documentElement.style.setProperty('--color-primary', '#f59e0b');
```

---

## Responsive Design

### Media Queries

```css
/* Mobile-first approach */
.container {
  padding: 1rem;
}

@media (min-width: 768px) {
  .container { padding: 2rem; }
}

@media (min-width: 1024px) {
  .container { max-width: 1280px; margin: 0 auto; }
}

/* Other query types */
@media (prefers-color-scheme: dark) { /* dark mode */ }
@media (prefers-reduced-motion: reduce) { animation: none; }
@media print { /* print styles */ }
```

### Container Queries (Modern)

Style based on the **container's** size, not the viewport:

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card { flex-direction: row; }
}
```

### Viewport Units

```css
/* Traditional */
height: 100vh;  /* viewport height — problematic on mobile (URL bar) */

/* Modern — accounts for browser chrome */
height: 100svh; /* small viewport height */
height: 100dvh; /* dynamic viewport height */
height: 100lvh; /* large viewport height */
```

---

## Pseudo-classes & Pseudo-elements

```css
/* Pseudo-classes — element state */
a:hover { }
input:focus { }
input:focus-visible { outline: 2px solid blue; } /* only keyboard focus */
li:first-child { }
li:nth-child(2n) { }  /* even */
li:nth-child(3n+1) { } /* 1st, 4th, 7th... */
:not(.disabled) { }
:is(h1, h2, h3) { }
p:has(> img) { }  /* p that has a direct img child */
input:user-valid { }   /* valid + user has interacted */
input:user-invalid { } /* invalid + user has interacted */

/* Pseudo-elements — virtual elements */
p::before { content: "→ "; }
p::after  { content: " ←"; }
::selection { background: #6366f1; color: white; }
::placeholder { color: #94a3b8; }
::first-line { font-weight: bold; }
```

---

## Transitions & Animations

```css
/* Transitions — between state changes */
.button {
  background: blue;
  transition: background 0.3s ease, transform 0.2s ease;
}
.button:hover {
  background: darkblue;
  transform: scale(1.05);
}

/* Keyframe animations */
@keyframes slide-in {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}

.modal {
  animation: slide-in 0.3s ease-out both;
}

/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  .modal { animation: none; }
}
```

---

## Common Layout Patterns

```css
/* Centered container */
.container {
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: 1.5rem;
}

/* Full-bleed section */
.full-bleed {
  width: 100vw;
  margin-inline: calc(50% - 50vw);
}

/* Vertical centering */
.centered {
  display: flex;
  place-items: center; /* shorthand for align-items + justify-items */
  min-height: 100svh;
}

/* Card grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* Sticky footer layout */
body {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
}
main { flex: 1; }
```
