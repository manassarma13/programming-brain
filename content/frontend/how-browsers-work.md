---
title: "How Browsers Work"
category: "Frontend Fundamentals"
difficulty: "beginner"
tags: ["browser", "rendering", "navigation", "multi-process", "engines"]
order: 1
---

# How Browsers Work

When you type a URL and press Enter, a remarkable sequence of events unfolds — from DNS resolution to a fully painted pixel on screen. Understanding this pipeline makes you a dramatically better frontend engineer.

---

## The Multi-Process Architecture

Modern browsers (Chrome, Firefox, Safari) are **multi-process** applications, not monolithic single processes. This provides security isolation and crash resilience.

| Process | Role |
|---|---|
| **Browser Process** | UI chrome (address bar, tabs), coordinates everything |
| **Renderer Process** | One per tab (sometimes per site). Runs HTML/CSS/JS. Sandboxed. |
| **GPU Process** | Handles GPU commands, compositing |
| **Network Process** | All network I/O (since Chrome 80) |
| **Plugin/Utility Processes** | Extensions, speech, etc. |

The renderer process is **sandboxed** — it cannot directly access the OS or filesystem. It communicates with the browser process via IPC (inter-process communication) for privileged operations.

```
User types URL
       │
Browser Process ──────► Network Process (DNS + HTTP)
       │
       │◄──── HTML bytes received
       │
Renderer Process created / reused
       │
  [Full rendering pipeline runs here]
       │
GPU Process ──► Composite layers ──► Screen pixels
```

---

## Step 1 — Navigation

### DNS Resolution
1. Browser checks its **DNS cache**
2. OS checks its local cache (`/etc/hosts`, system cache)
3. Query sent to **recursive resolver** (ISP or 8.8.8.8)
4. Resolver walks the DNS tree: root → TLD → authoritative nameserver
5. IP address returned and cached with TTL

### TCP + TLS Handshake
- **TCP 3-way handshake**: SYN → SYN-ACK → ACK (1 round trip)
- **TLS 1.3 handshake**: 1 round trip (vs 2 for TLS 1.2)
- **HTTP/2 & HTTP/3**: multiplexed streams; HTTP/3 uses QUIC (UDP-based, 0-RTT reconnect)

### HTTP Request/Response
```
GET / HTTP/1.1
Host: example.com
Accept: text/html
```

The server sends back HTML bytes. The **network process** streams these bytes to the **renderer process**.

---

## Step 2 — The Rendering Pipeline

Once the renderer process receives HTML bytes, it executes the **Critical Rendering Path**:

```
Bytes → Characters → Tokens → Nodes → DOM
                                        ╲
                                    Render Tree → Layout → Paint → Composite
                                        ╱
CSS Bytes → CSSOM
```

### Key Stages

| Stage | What happens |
|---|---|
| **Parse HTML** | Bytes → DOM tree (incrementally, streaming) |
| **Parse CSS** | Bytes → CSSOM (blocks rendering) |
| **JavaScript** | Can block parsing; modifies DOM/CSSOM |
| **Style calculation** | Combine DOM + CSSOM → computed styles per element |
| **Layout (reflow)** | Calculate exact geometry (x, y, width, height) |
| **Paint** | Record draw calls per layer |
| **Composite** | GPU merges layers → pixels on screen |

> **The golden rule**: Anything that triggers layout is expensive. Anything that only triggers composite (e.g., `transform`, `opacity`) is cheap.

---

## Step 3 — JavaScript Execution

The browser's renderer process embeds a **JavaScript engine** (V8 in Chrome/Node, SpiderMonkey in Firefox, JavaScriptCore in Safari). JS execution is **single-threaded** and runs on the **main thread**, the same thread that handles layout and painting.

This is why long JS tasks block the UI — there's only one thread.

```
Main Thread:
  Parse HTML ──► Parse CSS ──► JS execution ──► Layout ──► Paint
                                    │
                     (can block the parser here)
```

`<script>` tags by default block HTML parsing. Mitigate with:
- `defer` — execute after HTML parsed, before `DOMContentLoaded`
- `async` — execute as soon as downloaded (order not guaranteed)
- Dynamic `import()` — code-split on demand

---

## Browser Engines

| Engine | Browser(s) |
|---|---|
| **Blink** | Chrome, Edge, Opera, Samsung Internet |
| **WebKit** | Safari, all iOS browsers (mandated by Apple) |
| **Gecko** | Firefox |

Each engine has its own HTML parser, CSS engine, and JavaScript engine.

---

## Key Browser Processes & Threads Inside Renderer

| Thread | Role |
|---|---|
| **Main thread** | Parse HTML/CSS, run JS, layout, paint |
| **Compositor thread** | Handles scrolling & animations without main thread |
| **Raster threads** | Rasterize paint commands into bitmaps |
| **Worker threads** | Web Workers / Service Workers (separate JS contexts) |

---

## From URL to Pixel — Full Timeline

```
0ms    DNS lookup
50ms   TCP + TLS handshake
100ms  HTTP GET sent
200ms  First bytes arrive (TTFB)
300ms  HTML parsed, DOM building
350ms  CSS fetched and parsed, CSSOM ready
400ms  JS executed
450ms  Render tree built, layout calculated
480ms  Paint commands recorded
500ms  GPU composites layers → pixel appears (FCP)
```

Real-world pages have many more resources; the network waterfall can extend this significantly.

---

## Common Interview Questions

| Question | Key Answer |
|---|---|
| What is the difference between `DOMContentLoaded` and `load`? | `DOMContentLoaded` fires when HTML is parsed; `load` waits for all subresources (images, CSS) |
| Why does `<script>` block parsing? | Parser encounters script, must stop, execute JS (which might modify the DOM), then continue |
| What is a render-blocking resource? | CSS and sync scripts; delay FCP |
| How does `preload` help? | Fetches resource early at high priority without blocking parser |
| What is TTFB? | Time To First Byte — measures server + network latency |
