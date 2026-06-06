---
title: "Browser APIs"
category: "Frontend Fundamentals"
difficulty: "intermediate"
tags: ["DOM", "fetch", "web-storage", "intersection-observer", "web-workers", "service-workers", "websockets", "history-api"]
order: 6
---

# Browser APIs

The browser exposes a rich set of APIs beyond JavaScript itself. These APIs are implemented in C++ by the browser engine and are available through the global `window` object. Knowing them deeply separates engineers who ship performant, capable UIs from those who reach for a library for everything.

---

## DOM API

The **Document Object Model** API lets you programmatically read and manipulate the HTML structure.

### Querying

```javascript
// Modern — returns first match or null
document.querySelector('.card');
document.querySelector('#header');
document.querySelector('input[type="email"]');

// All matches (static NodeList)
document.querySelectorAll('.item');

// Live HTMLCollection (updates as DOM changes)
document.getElementsByClassName('item');
document.getElementsByTagName('div');

// Direct references
document.getElementById('root');
```

### Creating & Modifying

```javascript
const div = document.createElement('div');
div.className = 'card';
div.textContent = 'Hello'; // safe — no XSS risk
// div.innerHTML = '<b>Hello</b>'; // ⚠️ XSS risk if content is user-input

// Appending (modern)
parent.append(div);          // accepts strings and nodes
parent.prepend(div);
parent.replaceChildren(div); // replaces all children

// Classic
parent.appendChild(div);
parent.insertBefore(div, referenceNode);

// Remove
div.remove();

// Attributes
div.setAttribute('data-id', '42');
div.getAttribute('data-id'); // "42"
div.dataset.id;              // "42" (data-* shorthand)
div.toggleAttribute('disabled');
```

### Traversal

```javascript
el.parentElement
el.children         // live HTMLCollection of element children
el.childNodes       // NodeList including text nodes
el.firstElementChild / el.lastElementChild
el.nextElementSibling / el.previousElementSibling
el.closest('.container') // walks up ancestors, returns first match
el.matches('.active')    // does el match this selector?
```

### DocumentFragment — Batch DOM Updates

```javascript
// ✅ Build in a fragment, single DOM append = one reflow
const frag = document.createDocumentFragment();
data.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item.name;
  frag.append(li);
});
ul.append(frag);
```

---

## Events API

### addEventListener

```javascript
el.addEventListener('click', handler, {
  once: true,      // auto-remove after first call
  passive: true,   // hints: won't call preventDefault() (better scroll perf)
  capture: false,  // bubble phase (default)
  signal: abortController.signal, // auto-remove when aborted
});

el.removeEventListener('click', handler);
```

### Event Delegation

Attach one listener to a parent instead of N listeners on children:

```javascript
list.addEventListener('click', (e) => {
  const item = e.target.closest('.item');
  if (!item) return;
  handleItemClick(item.dataset.id);
});
```

### Custom Events

```javascript
const event = new CustomEvent('user-login', {
  bubbles: true,
  detail: { userId: 42 },
});
document.dispatchEvent(event);

document.addEventListener('user-login', (e) => {
  console.log(e.detail.userId); // 42
});
```

---

## Fetch API

The modern replacement for `XMLHttpRequest`:

```javascript
const res = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice' }),
  credentials: 'include',    // send cookies
  signal: AbortSignal.timeout(5000), // auto-abort after 5s
});

if (!res.ok) throw new Error(`HTTP ${res.status}`);
const user = await res.json();
```

### Abort Controller

```javascript
const controller = new AbortController();

setTimeout(() => controller.abort(), 3000);

try {
  const res = await fetch('/api/slow', { signal: controller.signal });
} catch (err) {
  if (err.name === 'AbortError') console.log('Fetch aborted');
}
```

### Streaming Responses

```javascript
const res = await fetch('/api/large-file');
const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  process(decoder.decode(value));
}
```

---

## Web Storage

| API | Capacity | Persistence | Scope |
|---|---|---|---|
| `localStorage` | ~5–10MB | Until cleared | Origin |
| `sessionStorage` | ~5MB | Tab session | Tab + Origin |
| `IndexedDB` | GBs | Until cleared | Origin |
| Cookies | ~4KB | Configurable | Origin + subdomains |

```javascript
// localStorage
localStorage.setItem('theme', 'dark');
localStorage.getItem('theme');    // "dark"
localStorage.removeItem('theme');
localStorage.clear();

// Always store as JSON for complex types
localStorage.setItem('user', JSON.stringify({ name: 'Alice' }));
const user = JSON.parse(localStorage.getItem('user'));
```

### IndexedDB (for structured data)

```javascript
const req = indexedDB.open('mydb', 1);

req.onupgradeneeded = (e) => {
  const db = e.target.result;
  db.createObjectStore('users', { keyPath: 'id' });
};

req.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('users', 'readwrite');
  tx.objectStore('users').add({ id: 1, name: 'Alice' });
};
```

Use the `idb` library for a cleaner Promise-based API.

---

## Intersection Observer

Observe when elements enter/leave the viewport — efficiently (no scroll event polling):

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Element is visible
      loadImage(entry.target);
      observer.unobserve(entry.target); // stop watching after load
    }
  });
}, {
  root: null,       // viewport
  rootMargin: '200px', // trigger 200px before entering viewport
  threshold: 0.1,   // 10% visible triggers callback
});

document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img);
});
```

Use cases: lazy loading, infinite scroll, analytics (element viewed), sticky headers.

---

## Resize Observer

```javascript
const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    adjustLayout(width);
  }
});

resizeObserver.observe(document.querySelector('.container'));
```

Prefer over `window.resize` for component-level responsiveness.

---

## Mutation Observer

Watch for DOM changes:

```javascript
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      console.log('Children changed:', mutation.addedNodes);
    }
    if (mutation.type === 'attributes') {
      console.log('Attribute changed:', mutation.attributeName);
    }
  }
});

observer.observe(targetNode, {
  childList: true,
  attributes: true,
  subtree: true,
});
```

---

## Web Workers

Run JavaScript on a **background thread** — no access to DOM but can do CPU-heavy work without blocking the UI:

```javascript
// main.js
const worker = new Worker('./worker.js');

worker.postMessage({ data: largeArray }); // send data (structured clone)

worker.onmessage = (e) => {
  console.log('Result:', e.data);
};

worker.onerror = (e) => console.error(e);

// worker.js
self.onmessage = (e) => {
  const result = expensiveComputation(e.data);
  self.postMessage(result);
};
```

Data is **copied** (structured clone) unless you use `SharedArrayBuffer` + `Atomics` for shared memory.

### Transferable Objects — Zero-Copy

```javascript
const buffer = new ArrayBuffer(1024 * 1024); // 1MB
// Transfer ownership — no copy, main thread loses access
worker.postMessage({ buffer }, [buffer]);
```

---

## Service Workers

A service worker is a **proxy** between the browser and network, running in a separate thread. Enables offline-first apps, push notifications, and background sync.

```javascript
// Register (main thread)
if ('serviceWorker' in navigator) {
  const reg = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  });
}

// sw.js — service worker
const CACHE = 'v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(['/', '/index.html', '/app.js', '/style.css'])
    )
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached ?? fetch(e.request) // cache-first strategy
    )
  );
});
```

Service worker lifecycle: **Installing → Installed → Activating → Activated → Redundant**

---

## History API

Manipulate browser history without page reload (SPA routing):

```javascript
// Push a new entry (user can navigate back)
history.pushState({ page: 'about' }, '', '/about');

// Replace current entry (no back entry added)
history.replaceState({ page: 'home' }, '', '/');

// Navigate programmatically
history.back();
history.forward();
history.go(-2);

// Listen for back/forward navigation
window.addEventListener('popstate', (e) => {
  console.log('State:', e.state);
  renderPage(location.pathname);
});
```

---

## WebSockets

Full-duplex, persistent connection between client and server:

```javascript
const ws = new WebSocket('wss://api.example.com/ws');

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'prices' }));
});

ws.addEventListener('message', (e) => {
  const data = JSON.parse(e.data);
  updateUI(data);
});

ws.addEventListener('close', (e) => {
  console.log('Closed:', e.code, e.reason);
  reconnect(); // implement exponential backoff
});

ws.addEventListener('error', console.error);

// Close cleanly
ws.close(1000, 'Done');
```

Use **Server-Sent Events (SSE)** for one-directional server → client streams (simpler, auto-reconnect):

```javascript
const evtSource = new EventSource('/api/events');
evtSource.onmessage = (e) => console.log(e.data);
evtSource.addEventListener('price-update', (e) => updatePrice(JSON.parse(e.data)));
```

---

## Clipboard API

```javascript
// Write
await navigator.clipboard.writeText('Hello');

// Read (requires user gesture + permission)
const text = await navigator.clipboard.readText();
```

## Geolocation API

```javascript
navigator.geolocation.getCurrentPosition(
  (pos) => console.log(pos.coords.latitude, pos.coords.longitude),
  (err) => console.error(err),
  { enableHighAccuracy: true, timeout: 5000 }
);
```

## Notification API

```javascript
const permission = await Notification.requestPermission();
if (permission === 'granted') {
  new Notification('New message', { body: 'Alice sent you a message', icon: '/icon.png' });
}
```
