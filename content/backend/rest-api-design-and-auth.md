---
title: "REST API Design & Authentication"
category: "Backend Engineering"
difficulty: "intermediate"
tags: ["REST", "API-design", "JWT", "OAuth", "authentication", "authorization", "API-versioning", "rate-limiting"]
order: 4
---

# REST API Design & Authentication

A well-designed API is a product. It should be intuitive, consistent, secure, and evolvable. Poor API design is expensive — every consumer has to work around your quirks, and breaking changes cascade across teams.

---

## REST Principles

REST (Representational State Transfer) defines 6 constraints:
1. **Client-Server** — Separation of concerns
2. **Stateless** — Each request contains all needed information; server holds no client state between requests
3. **Cacheable** — Responses must define themselves as cacheable or not
4. **Uniform Interface** — Consistent resource identification and manipulation
5. **Layered System** — Client can't tell if it's talking to the server or a proxy
6. **Code on Demand** (optional) — Server can send executable code

---

## Resource Design

Resources are **nouns**, not verbs. URLs identify resources; HTTP methods indicate actions.

```
✅ Good resource URLs
GET    /users              → list users
POST   /users              → create user
GET    /users/:id          → get user
PUT    /users/:id          → replace user (full update)
PATCH  /users/:id          → partial update
DELETE /users/:id          → delete user

GET    /users/:id/orders   → orders belonging to user
POST   /users/:id/orders   → create order for user

GET    /orders?status=pending&page=2&limit=20  → filter + paginate

❌ Bad — verbs in URLs (RPC style, not REST)
POST   /createUser
GET    /getUserById?id=42
POST   /deleteOrder
```

### HTTP Method Semantics

| Method | Safe? | Idempotent? | Use |
|---|---|---|---|
| GET | ✅ | ✅ | Read resource |
| HEAD | ✅ | ✅ | Read metadata only |
| OPTIONS | ✅ | ✅ | CORS preflight, capabilities |
| PUT | ❌ | ✅ | Replace entire resource |
| PATCH | ❌ | ❌* | Partial update |
| POST | ❌ | ❌ | Create, non-idempotent actions |
| DELETE | ❌ | ✅ | Delete resource |

---

## Status Codes — Use Them Correctly

```
2xx Success
  200 OK             — GET/PUT/PATCH success
  201 Created        — POST created a resource (include Location header)
  204 No Content     — DELETE success, or PUT/PATCH with no response body
  202 Accepted       — Async operation started (processing in background)

3xx Redirection
  301 Moved Permanently — resource URL has changed forever
  304 Not Modified      — client's cache is still valid (ETag match)

4xx Client Errors
  400 Bad Request      — malformed JSON, missing fields, invalid values
  401 Unauthorized     — not authenticated (missing/invalid token)
  403 Forbidden        — authenticated but not authorised
  404 Not Found        — resource doesn't exist
  409 Conflict         — duplicate, or version conflict (optimistic lock)
  422 Unprocessable    — validation errors on valid JSON
  429 Too Many Requests — rate limited

5xx Server Errors
  500 Internal Server Error — unhandled exception
  502 Bad Gateway          — upstream service error
  503 Service Unavailable  — temporary outage
  504 Gateway Timeout      — upstream timed out
```

---

## Response Envelope Design

```json
// Single resource
{
  "data": {
    "id": 42,
    "name": "Alice",
    "email": "alice@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}

// Collection with pagination
{
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 847,
    "totalPages": 43
  },
  "links": {
    "self":  "/users?page=2&limit=20",
    "first": "/users?page=1&limit=20",
    "prev":  "/users?page=1&limit=20",
    "next":  "/users?page=3&limit=20",
    "last":  "/users?page=43&limit=20"
  }
}

// Error response — consistent structure
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Must be a valid email address" },
      { "field": "age",   "message": "Must be a positive integer" }
    ],
    "requestId": "req_abc123xyz"
  }
}
```

---

## Authentication

### JWT (JSON Web Tokens)

A JWT is a self-contained, signed token with three base64-encoded parts: `header.payload.signature`.

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxNjM1NzI5NjAwfQ.abc123
      header                              payload                              signature
```

```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET; // min 256-bit random key
const JWT_EXPIRES = '15m';                 // keep access tokens short-lived
const REFRESH_EXPIRES = '7d';

// Issue tokens
function issueTokens(userId: number, role: string) {
  const accessToken = jwt.sign(
    { sub: userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES, algorithm: 'HS256' }
  );

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );

  return { accessToken, refreshToken };
}

// Verify middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ error: { code: 'MISSING_TOKEN' } });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    res.status(401).json({ error: { code } });
  }
}

// Refresh token endpoint
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    if (payload.type !== 'refresh') throw new Error('Not a refresh token');
    // Check refresh token is still in DB (not revoked)
    const stored = await db.getRefreshToken(payload.sub, refreshToken);
    if (!stored) return res.status(401).json({ error: { code: 'TOKEN_REVOKED' } });

    const tokens = issueTokens(payload.sub, payload.role);
    res.json({ data: tokens });
  } catch {
    res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN' } });
  }
});
```

**JWT Security Notes:**
- Store access tokens in memory (JS variable), not `localStorage` (XSS risk)
- Store refresh tokens in `HttpOnly; Secure; SameSite=Strict` cookies
- Rotate refresh tokens on use (refresh token rotation)
- Maintain a token denylist in Redis for logout/revocation

### OAuth 2.0 / OIDC

For "Login with Google/GitHub" and third-party API access:

```
User → Your App → Authorization Server (Google)
                  ↓ User authenticates & consents
              Authorization Code returned
              ↓
Your App exchanges code for tokens (server-side, secret never exposed)
              ↓
Access Token used to call APIs
```

```javascript
// Using a library (never implement OAuth manually)
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

app.post('/auth/google', async (req, res) => {
  const { credential } = req.body; // ID token from Google Sign-In

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const { sub, email, name, picture } = ticket.getPayload();

    // Find or create user
    let user = await db.findUserByGoogleId(sub);
    if (!user) {
      user = await db.createUser({ googleId: sub, email, name, picture });
    }

    const tokens = issueTokens(user.id, user.role);
    res.json({ data: tokens });
  } catch {
    res.status(401).json({ error: { code: 'INVALID_GOOGLE_TOKEN' } });
  }
});
```

---

## Authorization

```javascript
// Role-based (RBAC)
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    }
    next();
  };
}

app.delete('/users/:id', authenticate, requireRole('admin'), deleteUser);

// Resource-level authorization
app.get('/orders/:id', authenticate, async (req, res) => {
  const order = await db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: { code: 'NOT_FOUND' } });

  // Users can only see their own orders; admins see all
  if (req.user.role !== 'admin' && order.userId !== req.user.sub) {
    return res.status(403).json({ error: { code: 'FORBIDDEN' } });
  }

  res.json({ data: order });
});
```

---

## API Versioning

```
# URL versioning (most common, very explicit)
GET /api/v1/users
GET /api/v2/users

# Header versioning (cleaner URLs, harder to test in browser)
GET /api/users
Accept: application/vnd.myapp.v2+json

# Query param (least preferred)
GET /api/users?version=2
```

**Strategy:** Version when you make breaking changes. Non-breaking additions (new optional fields, new endpoints) don't need a new version. Keep v1 alive for at least 6–12 months after v2 launch with a `Sunset` header.

---

## Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  store: new RedisStore({ sendCommand: (...args) => redis.sendCommand(args) }),
  handler: (req, res) =>
    res.status(429).json({ error: { code: 'RATE_LIMITED', retryAfter: 900 } }),
}));

// Stricter limit on auth endpoints (prevent brute force)
app.use('/auth/', rateLimit({ windowMs: 60000, max: 10 }));
```

Rate limit headers to include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1700000000
Retry-After: 60  (when 429)
```
