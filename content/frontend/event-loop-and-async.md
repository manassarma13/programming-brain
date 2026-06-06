---
title: "Event Loop & Async JavaScript"
category: "Frontend Fundamentals"
difficulty: "intermediate"
tags: ["event-loop", "async", "promises", "microtask", "macrotask", "setTimeout", "async-await", "queueMicrotask"]
order: 5
---

# Event Loop & Async JavaScript

JavaScript is single-threaded, yet it handles I/O, timers, and user events concurrently. The **event loop** is the mechanism that makes this possible. Misunderstanding it causes subtle bugs — mastering it makes you unstoppable.

---

## The Single-Threaded Reality

JS has one **main thread** with one **call stack**. Only one piece of code runs at a time. So how does `setTimeout` work without blocking?

The answer: **it doesn't run in JavaScript** — the browser's C++ timer API handles the waiting, and when done, schedules a callback back into JS via the event loop.

---

## Components of the Runtime

```
┌──────────────────────────────────────────────────────┐
│                   Browser / Node.js                   │
│                                                        │
│  ┌─────────────┐   ┌───────────────────────────────┐ │
│  │  Call Stack  │   │      Web APIs / C++ APIs       │ │
│  │             │   │  setTimeout, fetch, DOM events  │ │
│  │  (JS engine) │   │  These run outside JS thread   │ │
│  └──────┬──────┘   └──────────────┬────────────────┘ │
│         │                          │                   │
│         │    ┌─────────────────────▼──────────────┐   │
│         │    │         Task Queues                  │   │
│         │    │                                      │   │
│         │    │  Microtask Queue (high priority)     │   │
│         │    │  [Promise.then, queueMicrotask,      │   │
│         │    │   MutationObserver]                  │   │
│         │    │                                      │   │
│         │    │  Macrotask Queue (lower priority)    │   │
│         │    │  [setTimeout, setInterval,           │   │
│         │    │   setImmediate, I/O, UI events]      │   │
│         │    └──────────────────────────────────────┘  │
│         │                          │                   │
│  ┌──────▼──────────────────────────▼──────────────┐   │
│  │                  Event Loop                      │   │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## The Event Loop — Precise Algorithm

Each **iteration** (tick) of the event loop follows this order:

```
1. Execute the current call stack to completion (run-to-completion)
2. Drain the ENTIRE microtask queue (run ALL microtasks)
   - If a microtask enqueues another microtask, run that too
   - Repeat until microtask queue is empty
3. Render (browser checks if repaint is needed — ~16ms intervals)
4. Pick ONE task from the macrotask queue, push its callback to the stack
5. Go to step 1
```

This means: **microtasks always run before the next macrotask**.

---

## Macrotasks vs Microtasks

| Type | Sources | Priority |
|---|---|---|
| **Microtask** | `Promise.then/catch/finally`, `queueMicrotask()`, `MutationObserver` | Higher — runs immediately after current task |
| **Macrotask** | `setTimeout`, `setInterval`, `setImmediate` (Node), `MessageChannel`, UI events, `requestAnimationFrame`* | Lower — one per event loop tick |

*`requestAnimationFrame` is technically neither — it runs before paint, after microtasks.

---

## Classic Quiz — Predict the Output

```javascript
console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve()
  .then(() => console.log("3"))
  .then(() => console.log("4"));

console.log("5");
```

**Answer: 1, 5, 3, 4, 2**

Walk-through:
1. `"1"` → sync, logs immediately
2. `setTimeout` → registered, callback queued as macrotask
3. `Promise.resolve().then(...)` → microtask queued for `"3"`
4. `"5"` → sync, logs immediately
5. Stack empty → drain microtask queue: `"3"` runs → `.then("4")` enqueued → `"4"` runs
6. Microtask queue empty → pick next macrotask: `"2"` runs

---

## Promises — Deep Dive

A **Promise** is an object representing an eventual value (fulfilled) or failure (rejected).

### States
```
pending → fulfilled (value)
        ↘ rejected  (reason)
```

Once settled, a promise is immutable — it never changes state again.

### Promise Chaining

`.then()` always returns a **new Promise**:

```javascript
fetch('/api/user')
  .then(res => res.json())     // returns Promise<json>
  .then(user => user.name)     // returns Promise<name>
  .then(name => console.log(name))
  .catch(err => console.error(err)); // catches any rejection in chain
```

### Promise.all vs Promise.allSettled vs Promise.race vs Promise.any

```javascript
// All resolve or one rejects → rejects immediately
const [a, b] = await Promise.all([fetchA(), fetchB()]);

// All settle (regardless of rejection)
const results = await Promise.allSettled([fetchA(), fetchB()]);
results.forEach(r => {
  if (r.status === 'fulfilled') use(r.value);
  else handle(r.reason);
});

// Resolves/rejects with whichever settles first
const fastest = await Promise.race([fetchA(), fetchB()]);

// Resolves with first fulfilled; rejects only if ALL reject
const first = await Promise.any([fetchA(), fetchB()]);
```

---

## async/await — Syntactic Sugar

`async/await` is syntax sugar over Promises. An `async` function always returns a Promise.

```javascript
async function fetchUser(id) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // await unwraps the Promise
}
```

`await` **suspends the async function** (not the whole thread!) until the Promise settles, then resumes execution. Other tasks can run during this suspension.

### Error Handling with async/await

```javascript
// Pattern 1: try/catch
async function getUser(id) {
  try {
    const user = await fetchUser(id);
    return user;
  } catch (err) {
    console.error("Failed:", err);
    return null;
  }
}

// Pattern 2: .catch on the await expression
const user = await fetchUser(id).catch(() => null);
```

### Parallel vs Sequential

```javascript
// ❌ Sequential — 2000ms total (fetches one after another)
const a = await fetchA(); // 1000ms
const b = await fetchB(); // 1000ms

// ✅ Parallel — 1000ms total (both fire simultaneously)
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

---

## queueMicrotask

Explicitly enqueue a microtask (runs before next macrotask, after current synchronous code):

```javascript
queueMicrotask(() => {
  console.log("microtask");
});
console.log("sync");
// Output: sync, microtask
```

Useful for deferring work without the overhead of a full Promise.

---

## setTimeout(fn, 0) — Not Truly Immediate

`setTimeout(fn, 0)` doesn't mean "run now". It means "run after at least 0ms AND after current task + all microtasks complete". In practice, browsers clamp minimum delay to ~4ms after nested timers.

```javascript
setTimeout(() => console.log("A"), 0);
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));

// Output: C, A, B
// C runs first (microtask), then macrotasks A and B in order
```

---

## requestAnimationFrame

`requestAnimationFrame(callback)` schedules a callback to run **before the next browser paint**, typically at 60fps (every ~16.67ms). It's the right tool for animations:

```javascript
function animate(timestamp) {
  // Update animation state
  element.style.transform = `translateX(${timestamp / 10 % 300}px)`;

  requestAnimationFrame(animate); // schedule next frame
}

requestAnimationFrame(animate);
```

The callback receives a `DOMHighResTimeStamp`. Cancel with `cancelAnimationFrame(id)`.

---

## The Rendering Opportunity

Between macrotasks, the browser checks if it needs to repaint. This is why long JS tasks cause visible jank:

```
Macrotask (100ms JS) → Microtasks → [Browser wants to paint but can't!] → next Macrotask
```

**Long tasks** (>50ms) block painting and make the UI feel unresponsive. Break them up:

```javascript
// ❌ Blocks for 500ms
function processLargeArray(arr) {
  arr.forEach(item => expensiveWork(item));
}

// ✅ Yields control every chunk, allowing renders between chunks
async function processLargeArrayAsync(arr) {
  const CHUNK = 100;
  for (let i = 0; i < arr.length; i += CHUNK) {
    arr.slice(i, i + CHUNK).forEach(item => expensiveWork(item));
    await new Promise(r => setTimeout(r, 0)); // yield to event loop
  }
}

// ✅ Even better: scheduler.yield() (modern browsers)
async function processWithScheduler(arr) {
  for (const item of arr) {
    expensiveWork(item);
    if (performance.now() % 16 < 1) {
      await scheduler.yield(); // yield to browser
    }
  }
}
```

---

## Node.js Event Loop — Extra Phases

Node.js extends the event loop with additional phases (via libuv):

```
   timers          → setTimeout, setInterval callbacks
   pending I/O     → deferred I/O callbacks
   idle/prepare    → internal
   poll            → retrieve new I/O events
   check           → setImmediate callbacks
   close callbacks → socket.on('close', ...)
```

`setImmediate` runs in the **check** phase — after I/O, before timers of the next iteration.

```javascript
// In I/O callback:
setImmediate(() => console.log("immediate")); // runs in check phase
setTimeout(() => console.log("timeout"), 0);  // runs in timers phase next loop
// Typically: immediate, timeout (but not guaranteed outside I/O)
```

`process.nextTick()` is a **microtask** in Node — runs before any I/O or timers, even before other microtasks. Use sparingly.

---

## Visual Summary

```
Call Stack empty?
        │ Yes
        ▼
Drain microtask queue completely
        │
        ▼
Render opportunity (browser paints if needed)
        │
        ▼
Pick one macrotask → push to call stack → execute
        │
        ▼
     (repeat)
```
