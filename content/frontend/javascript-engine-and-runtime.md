---
title: "JavaScript Engine & Runtime"
category: "Frontend Fundamentals"
difficulty: "intermediate"
tags: ["V8", "JIT", "ignition", "turbofan", "garbage-collection", "memory-heap", "compiler"]
order: 3
---

# JavaScript Engine & Runtime

The JavaScript engine is what turns your human-readable code into machine instructions. Understanding its internals helps you write faster code and debug mysterious performance issues.

---

## What Is a JavaScript Engine?

A **JavaScript engine** is a program that executes JavaScript code. The major engines:

| Engine | Used by | Language |
|---|---|---|
| **V8** | Chrome, Node.js, Edge, Deno | C++ |
| **SpiderMonkey** | Firefox | C++, Rust |
| **JavaScriptCore (JSC)** | Safari, all iOS browsers | C++ |
| **Hermes** | React Native | C++ |

We'll focus on **V8**, the most widely deployed.

---

## V8 Architecture Overview

```
JavaScript Source Code
         │
         ▼
    ┌─────────────┐
    │   Parser    │  → AST (Abstract Syntax Tree)
    └─────────────┘
         │
         ▼
    ┌─────────────┐
    │  Ignition   │  → Bytecode (interpreter)
    │ (Interpreter)│
    └─────────────┘
         │  (hot functions detected by profiler)
         ▼
    ┌─────────────┐
    │  TurboFan   │  → Optimised Machine Code (JIT compiler)
    │(JIT Compiler)│
    └─────────────┘
         │  (deoptimise if type assumptions break)
         ▼
    Machine Code runs on CPU
```

### Parsing
V8 first **parses** source code into an **Abstract Syntax Tree (AST)**.

V8 uses two parsing strategies:
- **Eager parsing**: Full parse, AST built immediately (used for code likely to run soon)
- **Lazy parsing**: Pre-parse only (check syntax, skip building full AST) for functions not yet called — saves startup time

### Ignition — The Interpreter
Ignition takes the AST and generates **bytecode** — a compact, portable instruction set (not native machine code). Bytecode is faster to generate than machine code, allowing quick startup.

```
// Simplified bytecode for: function add(a, b) { return a + b; }
LdaNamedProperty a0, [0]   // load 'a'
Add a1                     // add 'b'
Return
```

### TurboFan — The JIT Compiler
Ignition **profiles** which functions run frequently ("hot" functions). TurboFan takes these hot functions and compiles them to **optimised native machine code**.

Key optimisations TurboFan applies:
- **Inlining**: Replace function call with function body
- **Hidden classes (Shapes)**: Track object structure for fast property access
- **Type specialisation**: Generate fast code assuming types don't change
- **Escape analysis**: Allocate objects on the stack instead of heap

---

## Hidden Classes (V8 Shapes)

V8 creates internal **hidden classes** (also called "Shapes" or "Maps") to represent the structure of objects. Objects sharing the same shape share optimised property access code.

```javascript
// V8 creates Shape0 → Shape1 → Shape2 as properties are added
const p1 = {};
p1.x = 1; // transition to Shape{x}
p1.y = 2; // transition to Shape{x,y}

const p2 = {};
p2.x = 3; // reuses Shape{x}
p2.y = 4; // reuses Shape{x,y} — same shape as p1 → fast!

// ❌ Don't do this — p3 gets a unique shape
const p3 = {};
p3.y = 1; // Shape{y}
p3.x = 2; // Shape{y,x} — different shape from p1!
```

**Best practice:** Always initialise object properties in the same order. Define all properties in the constructor.

---

## Deoptimisation

TurboFan makes type assumptions. If a function receives a different type than expected, V8 **deoptimises** — discards the compiled code and falls back to Ignition bytecode.

```javascript
function add(a, b) { return a + b; }

add(1, 2);   // V8 optimises for numbers
add(1, 2);
add(1, 2);
// ... 1000 calls
add("hello", " world"); // ← triggers deoptimisation!
```

This is why monomorphic functions (same types every call) are fastest. Polymorphic (2-3 types) is slower. Megamorphic (many types) is slowest.

---

## Memory Management

### The Heap

V8's heap is divided into several regions:

| Region | Purpose |
|---|---|
| **New Space (Young generation)** | Short-lived objects. Small (~1–8 MB). |
| **Old Space (Old generation)** | Long-lived objects that survived GC. Larger. |
| **Large Object Space** | Objects >256KB; never moved by GC |
| **Code Space** | Compiled bytecode and machine code |
| **Map Space** | Hidden class objects (Maps) |

### Garbage Collection

V8 uses a **generational garbage collector** based on the hypothesis that most objects die young.

#### Minor GC (Scavenger) — New Space
- **Algorithm**: Semi-space copying (Cheney's algorithm)
- Objects allocated in "from" space
- Live objects copied to "to" space; dead ones discarded
- Survivors promoted to Old Space after ~2 GCs
- Very fast: only scans young generation

```
New Space:
  From-space: [obj1(live)] [obj2(dead)] [obj3(live)]
                                ↓ Scavenge
  To-space:   [obj1]                    [obj3]        ← obj2 collected
```

#### Major GC (Mark-Sweep-Compact) — Old Space
- **Mark**: Traverse object graph from GC roots (global, stack), mark live objects
- **Sweep**: Reclaim memory of unmarked objects
- **Compact**: Optionally defragment memory by moving objects together
- Uses **incremental marking** and **concurrent marking** to avoid long pauses

#### Orinoco — Concurrent/Parallel GC
V8's modern GC (codenamed Orinoco) performs most GC work **concurrently on background threads**, keeping the main thread responsive:

| Phase | Main thread paused? |
|---|---|
| Incremental marking | No (small increments between tasks) |
| Concurrent marking | No |
| Atomic pause (finalise) | Yes (very briefly ~1ms) |
| Concurrent sweeping | No |

---

## Memory Leaks — Common Causes

| Cause | Example |
|---|---|
| **Forgotten timers** | `setInterval` referencing outer scope object |
| **Detached DOM nodes** | DOM node removed from tree but referenced by JS |
| **Closures retaining large data** | Inner function keeping large outer variable alive |
| **Global variables** | Accidental `window.leakedData = bigArray` |
| **Event listeners not removed** | `addEventListener` without `removeEventListener` |

```javascript
// ❌ Memory leak — closure retains `largeData`
function leak() {
  const largeData = new Array(1_000_000).fill(0);
  return function() { console.log(largeData.length); };
}
const leaked = leak(); // largeData never collected

// ✅ Fix — use WeakRef for optional references
class Cache {
  #store = new Map();
  set(key, value) { this.#store.set(key, new WeakRef(value)); }
  get(key) { return this.#store.get(key)?.deref(); }
}
```

---

## The Runtime Environment

The **JavaScript runtime** is the engine + the host environment's APIs:

```
┌─────────────────────────────────────────────────┐
│              Host Environment                    │
│  (Browser or Node.js)                           │
│                                                  │
│  ┌──────────────┐   ┌───────────────────────┐   │
│  │  V8 Engine   │   │   Web APIs / Node APIs │   │
│  │  (JS engine) │   │  setTimeout, fetch,    │   │
│  │              │   │  DOM, fs, http...       │   │
│  └──────┬───────┘   └──────────┬────────────┘   │
│         │                      │                  │
│  ┌──────▼──────────────────────▼────────────┐   │
│  │         Event Loop + Task Queues          │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

The JS engine itself has **no concept of** `setTimeout`, `fetch`, or the DOM — those are provided by the host environment and scheduled through the event loop.

---

## Practical Performance Tips

| Tip | Why |
|---|---|
| Keep functions monomorphic | Avoids deoptimisation |
| Initialise all object properties in constructor | Stable hidden class |
| Avoid `delete obj.prop` | Changes hidden class, deoptimises |
| Use `TypedArray` for numeric-heavy code | Avoids boxing; directly machine-word sized |
| Avoid creating closures in hot loops | Allocation pressure on GC |
| Use `--prof` flag (Node.js) | Profile V8 to find hot functions |
| Use Chrome DevTools Memory tab | Detect heap leaks with heap snapshots |
