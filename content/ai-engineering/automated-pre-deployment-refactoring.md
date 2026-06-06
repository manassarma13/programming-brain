---
title: "Automated Pre-Deployment Refactoring"
category: "AI-Driven Engineering"
difficulty: "advanced"
tags: ["refactoring", "pre-deployment", "AI-agent", "code-quality", "SOLID", "DRY", "performance", "security", "automation"]
order: 2
---

# Automated Pre-Deployment Refactoring

In the agentic development model, the AI doesn't just write new code — it actively reviews and improves existing code *before it ships*. This document defines a systematic framework for pre-deployment automated refactoring: what to scan, what to fix, and what to surface for human judgment.

> **Execution Phase:** This agent runs after the feature branch is complete, before the deployment pipeline begins — giving you a final quality gate that catches what manual review misses.

---

## The Agent's Mission

```
Trigger: Developer marks branch as "ready for review"

Agent Tasks:
  1. Scan the entire diff (and affected modules) for quality violations
  2. Auto-apply safe, mechanical fixes (formatting, obvious extractions)
  3. Flag and propose (but not apply) architectural changes
  4. Generate a refactoring report for human review
  5. Block deployment on critical security/correctness issues
  6. Allow deployment with warnings for style/performance suggestions
```

---

## 1. DRY & Reusability

### Logic Extraction

The agent identifies code that is **copy-pasted or logically duplicated** across files and flags it for extraction. Rather than developers manually hunting for duplicate blocks, the agent semantically understands when two pieces of code achieve the exact same outcome and proposes a unified utility function.

```typescript
// ❌ Agent detects: same pagination logic in 6 controller files
// users.controller.ts
const page  = Math.max(1, parseInt(req.query.page as string) || 1);
const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
const offset = (page - 1) * limit;

// orders.controller.ts — identical block
const page  = Math.max(1, parseInt(req.query.page as string) || 1);
const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
const offset = (page - 1) * limit;

// ✅ Agent proposes extraction:
// lib/pagination.ts
export function parsePagination(query: Record<string, unknown>) {
  const page  = Math.max(1, parseInt(String(query.page  ?? '1'),  10));
  const limit = Math.min(100, parseInt(String(query.limit ?? '20'), 10));
  return { page, limit, offset: (page - 1) * limit };
}

// Now all controllers import this single source of truth
```

### Centralized Constants

Magic strings and numbers scattered throughout a codebase make sweeping changes difficult and error-prone. The agent scans for recurring literal values (like timeouts, retry limits, or token expirations) and proposes extracting them into a centralized configuration file.

```typescript
// ❌ Agent detects: magic numbers/strings scattered across codebase
// auth.ts
if (retries > 3) { ... }
const TOKEN_EXP = '15m';

// rate-limit.ts
max: 3,   // same number, different context — or is it?

// email.ts
const MAX_RETRIES = 3; // yet another copy

// ✅ Agent creates: config/constants.ts
export const AUTH = {
  MAX_LOGIN_ATTEMPTS:    3,
  ACCESS_TOKEN_EXPIRES:  '15m',
  REFRESH_TOKEN_EXPIRES: '7d',
  BCRYPT_ROUNDS:         12,
} as const;

export const RATE_LIMIT = {
  AUTH_WINDOW_MS:   60_000,
  AUTH_MAX_REQUESTS: 10,
  API_WINDOW_MS:    900_000,
  API_MAX_REQUESTS:  100,
} as const;
```

### Modularization Detection

Files that grow too large inevitably become dumping grounds for unrelated logic. The agent uses predefined heuristics to flag files or functions that have grown beyond manageable cognitive limits, suggesting boundaries where they can be split.

```
Agent heuristics that flag a file for split:
  - File > 400 lines
  - Function > 50 lines
  - File imports > 15 different modules
  - Single function with cyclomatic complexity > 15
  - File handles both HTTP request/response AND database queries
    (mixing transport layer and data layer)
```

---

## 2. Architectural Integrity (SOLID & Beyond)

### Single Responsibility (SRP)

Classes or modules that handle multiple concerns are fragile. The agent scans for "God classes" that mix presentation logic, business rules, and infrastructure interactions, proposing a structural decomposition so each component has only one reason to change.

```typescript
// ❌ Agent flags: UserController doing too much
class UserController {
  async register(req, res) {
    // 1. Validate input
    const { email, password } = req.body;
    if (!email.includes('@')) return res.status(400).json({ error: 'Bad email' });

    // 2. Hash password
    const hash = await bcrypt.hash(password, 12);

    // 3. Database insert
    const user = await db.query('INSERT INTO users...', [email, hash]);

    // 4. Send welcome email (!!!)
    await nodemailer.sendMail({ to: email, subject: 'Welcome!', ... });

    // 5. Generate token
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET);

    // 6. Track analytics (!!!)
    await mixpanel.track('user.registered', { userId: user.id });

    res.status(201).json({ token });
  }
}

// ✅ Agent proposes decomposition:
// Controller → only handles HTTP (validates input, calls service, formats response)
// AuthService → handles registration business logic
// EmailService → handles all email sending
// AnalyticsService → handles event tracking
// Each can change independently
```

### Open/Closed (OCP)

Hardcoded conditional chains make adding new features risky. The agent looks for growing `switch` or `if/else` statements that check the "type" of an object, suggesting polymorphic patterns (like the Strategy Pattern) so new logic can be added via new files rather than modifying existing ones.

```typescript
// ❌ Agent flags: switch statement that needs modification for each new type
function processPayment(method: string, amount: number) {
  switch (method) {
    case 'stripe':  return stripeCharge(amount);
    case 'paypal':  return paypalCharge(amount);
    case 'crypto':  return cryptoCharge(amount);
    // Adding new method requires modifying this function
  }
}

// ✅ Agent proposes: Strategy pattern — open for extension, closed for modification
interface PaymentProcessor {
  charge(amount: number): Promise<PaymentResult>;
}

class StripeProcessor implements PaymentProcessor { ... }
class PaypalProcessor implements PaymentProcessor { ... }

class PaymentService {
  private processors: Map<string, PaymentProcessor>;

  process(method: string, amount: number) {
    const processor = this.processors.get(method);
    if (!processor) throw new UnsupportedPaymentMethodError(method);
    return processor.charge(amount);   // add new method = add new class, not modify this
  }
}
```

### Liskov Substitution (LSP)

Inheritance should guarantee behavioral consistency. The agent flags subclasses that break the implicit contract of their parents—such as throwing unexpected exceptions, returning inconsistent types, or requiring stricter conditions than the base class.

```typescript
// ❌ Agent flags: Subclass changes expected behavior by throwing an unexpected error
class FileCache {
  set(key: string, value: string) { /* writes to file */ }
}

class ReadOnlyCache extends FileCache {
  set(key: string, value: string) {
    throw new Error("Cannot write to read-only cache"); // Breaks LSP! Caller didn't expect this.
  }
}

// ✅ Agent proposes: Redesign hierarchy to not promise what it can't deliver
interface ReadableCache { get(key: string): string; }
interface WritableCache extends ReadableCache { set(key: string, value: string): void; }
```

### Interface Segregation (ISP)

Components shouldn't depend on things they don't use. The agent detects when massive objects are passed into functions or components that only utilize a tiny fraction of their properties, proposing slimmer, role-specific interfaces.

```typescript
// ❌ Agent flags: "God-interface" used where only a fraction is needed
// `User` has 50 properties (email, password, address, etc.), but component only uses 2
function UserAvatar({ user }: { user: User }) {
  return <img src={user.avatarUrl} alt={user.name} />;
}

// ✅ Agent proposes: Extract minimal required interface for the dependency
interface AvatarUser {
  avatarUrl: string;
  name: string;
}

function UserAvatar({ user }: { user: AvatarUser }) {
  return <img src={user.avatarUrl} alt={user.name} />;
}
```

### Dependency Inversion (DIP)

High-level business logic shouldn't be entangled with low-level implementation details. The agent looks for direct instantiations of external services or databases within core logic domains, proposing the injection of interfaces to keep the core testable and decoupled.

```typescript
// ❌ Agent flags: high-level module depends on concrete implementation
class OrderService {
  private emailer = new SendGridEmailer();       // concrete dependency
  private db      = new PostgresRepository();   // concrete dependency

  async createOrder(data: OrderData) {
    const order = await this.db.insert(data);
    await this.emailer.send(order.userId, 'Order created');
    return order;
  }
}

// ✅ Agent proposes: inject abstractions
interface Emailer     { send(userId: number, subject: string): Promise<void>; }
interface OrderRepo   { insert(data: OrderData): Promise<Order>; }

class OrderService {
  constructor(
    private readonly db:      OrderRepo,   // abstraction
    private readonly emailer: Emailer,     // abstraction
  ) {}

  // Now testable with mock implementations
  // Swapping SendGrid → Postmark = zero changes to OrderService
}
```

### KISS & YAGNI

Over-engineering adds friction. The agent proactively identifies unused abstractions, empty interfaces, and excessively complex design patterns applied to simple problems, recommending their removal in favor of straightforward implementations.

```typescript
// ❌ Agent flags: Dead code / "Just in case" abstractions (YAGNI violation)
interface CacheDriver { /* ... */ }
class MemcachedDriver implements CacheDriver { /* ... */ } // Agent detects: never instantiated anywhere in the codebase

// ❌ Agent flags: Over-engineering (KISS violation)
class StringReverseStrategyFactory {
  create() { return new DefaultReverseStrategy(); }
}
// Agent proposes: replace 3 files with a simple utility function
```

### Composition Over Inheritance

Deep inheritance trees create brittle codebases where changing a base class breaks distant descendants. The agent detects deep nesting and proposes flattening the architecture by composing independent behavioral modules instead.

```typescript
// ❌ Agent flags: Deep inheritance tree (> 2 levels)
class AdminUser extends AuthenticatedUser extends BaseUser extends Entity { /* ... */ }

// ✅ Agent proposes: Flatten hierarchy using composition
class AdminUser {
  constructor(private auth: Authenticator, private permissions: PermissionManager) {}
}
```

### Law of Demeter

Objects should only talk to their immediate friends. The agent flags "train wrecks"—long chains of method calls reaching deep into the structure of unrelated objects—and suggests delegating the behavior closer to where the data lives.

```typescript
// ❌ Agent flags: Train wreck (chaining > 2 dots on different domain objects)
const zipCode = order.getCustomer().getProfile().getAddress().getZipCode();

// ✅ Agent proposes: Tell, Don't Ask
const zipCode = order.getCustomerZipCode(); // Delegate the knowledge down
```

---

## 3. Data Structures & Algorithm Complexity

### O(n²) → O(n) Detection

Nested loops over large collections are silent performance killers. The agent analyzes algorithmic complexity, specifically hunting for `Array.find` or `Array.filter` inside `.map` or `for` loops. It automatically proposes pre-computing a Hash Map to reduce time complexity from quadratic to linear.

```typescript
// ❌ Agent flags: O(n²) lookup — common in JS code
function getOrdersWithUserNames(orders: Order[], users: User[]) {
  return orders.map(order => ({
    ...order,
    userName: users.find(u => u.id === order.userId)?.name, // O(n) per order!
  }));
}
// Total: O(orders × users) — catastrophic with large datasets

// ✅ Agent auto-proposes: build lookup map first — O(n + m)
function getOrdersWithUserNames(orders: Order[], users: User[]) {
  const userMap = new Map(users.map(u => [u.id, u])); // O(m) once
  return orders.map(order => ({
    ...order,
    userName: userMap.get(order.userId)?.name, // O(1) per order
  }));
}
// Total: O(orders + users)
```

### Set for Membership Checks

Repeatedly checking if an item exists in a large array scales poorly. The agent flags `.includes()` or `.indexOf()` calls within frequent operations and suggests using a `Set` for instant O(1) lookups.

```typescript
// ❌ Agent flags: Array.includes() in hot loop — O(n) per check
const BLOCKED_DOMAINS = ['spam.com', 'trash.net', 'junk.io'];

function isBlocked(email: string) {
  const domain = email.split('@')[1];
  return BLOCKED_DOMAINS.includes(domain); // O(n) — fine for 3, bad for 300
}

// ✅ Agent converts to Set — O(1) lookup
const BLOCKED_DOMAINS = new Set(['spam.com', 'trash.net', 'junk.io']);

function isBlocked(email: string) {
  return BLOCKED_DOMAINS.has(email.split('@')[1]); // O(1)
}
```

### Design Pattern Suggestions

Based on structural smells, the agent can recommend specific Gang of Four design patterns to resolve underlying architectural tension.

| Agent detects | Suggests |
|---|---|
| Global mutable variables accessed everywhere | Context/Provider or dependency injection |
| `if type === 'X' ... else if type === 'Y'` chains | Strategy or polymorphism |
| Deep prop-drilling (5+ levels) | Context, store, or component composition |
| Objects created with complex conditional construction | Factory Method or Builder |
| Tight coupling between event emitter and handler | Observer / EventBus |
| Same sequence of steps with varying implementations | Template Method |

---

## 4. Performance Optimisation

### Debounce / Throttle Audit

Unbound event listeners (like scroll, resize, or keypress) can easily overload the main thread. The agent scans UI code for raw event attachments and recommends applying `throttle` (for continuous but rate-limited execution) or `debounce` (to wait until the action stops).

```typescript
// ❌ Agent flags: unthrottled high-frequency handler
window.addEventListener('scroll', () => {
  checkIfNearBottom(); // fires 60× per second while scrolling!
  updateScrollProgress();
});

// ✅ Agent proposes: throttle for scroll (rate-limit but guaranteed fire)
import { throttle } from 'lodash-es';

window.addEventListener('scroll', throttle(() => {
  checkIfNearBottom();
  updateScrollProgress();
}, 100)); // max 10× per second

// ❌ Agent flags: search input firing API on every keystroke
input.addEventListener('input', () => {
  searchAPI(input.value); // every character = one API call
});

// ✅ Debounce for search (wait until typing stops)
import { debounce } from 'lodash-es';

input.addEventListener('input', debounce(() => {
  searchAPI(input.value); // fires 300ms after last keystroke
}, 300));
```

### Memoization Opportunities

Re-running expensive calculations on every render destroys frontend performance. The agent detects intensive array operations (sorting, mapping large sets) inside render paths and proposes wrapping them in memoization hooks to preserve results across renders.

```typescript
// ❌ Agent flags: expensive computation inside render/hot path
function ProductList({ products, filters }) {
  // Recalculates on every render, even if products/filters unchanged
  const filtered = products
    .filter(p => p.price >= filters.min && p.price <= filters.max)
    .sort((a, b) => a.price - b.price);

  return filtered.map(p => <ProductCard key={p.id} product={p} />);
}

// ✅ Agent proposes: memoize the expensive computation
const filtered = useMemo(
  () => products
    .filter(p => p.price >= filters.min && p.price <= filters.max)
    .sort((a, b) => a.price - b.price),
  [products, filters.min, filters.max] // only recalculate when these change
);
```

### Lazy Loading Detection

Loading massive dependencies upfront bloats the initial bundle size. The agent checks bundle weights of static imports and flags large libraries that are only used conditionally, proposing dynamic imports (`await import()`) to defer their loading.

```typescript
// ❌ Agent flags: heavy library imported eagerly in main bundle
import { Chart } from 'chart.js'; // 180KB — loaded even if user never sees a chart

// ✅ Agent proposes: dynamic import
async function renderChart(canvas: HTMLCanvasElement, data: ChartData) {
  const { Chart } = await import('chart.js'); // loaded only when needed
  return new Chart(canvas, { type: 'bar', data });
}
```

---

## 5. Error Handling & Security

### Missing Error Boundaries

An unhandled exception in an async function can crash a Node.js process. The agent statically analyzes all route handlers and background tasks to ensure they are wrapped in standard `try/catch` blocks or appropriate middleware boundaries.

```typescript
// ❌ Agent flags: unhandled promise rejection — crashes the entire request
app.get('/users/:id', async (req, res) => {
  const user = await db.findUser(req.params.id); // throws if DB is down
  res.json(user);
  // No try/catch → unhandled rejection → server may crash
});

// ✅ Agent wraps in try/catch or async error middleware
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
  res.json({ data: user });
}));

// Global async handler wrapper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

### Input Sanitization

Trusting user input is the root of most security vulnerabilities. The agent detects unescaped data entering the DOM (XSS), raw string interpolation into SQL queries (SQLi), and unsanitized file paths (Path Traversal), mandating immediate safety wrappers.

```typescript
// ❌ Agent flags: raw user input directly in DOM (XSS vector)
commentDiv.innerHTML = req.body.comment;

// ❌ Agent flags: raw interpolation in SQL (injection vector)
const query = `SELECT * FROM users WHERE name = '${req.query.name}'`;

// ❌ Agent flags: unsanitised path traversal
const file = path.join('/uploads', req.params.filename); // ../../../../etc/passwd

// ✅ Agent proposes:
import DOMPurify from 'dompurify';
commentDiv..innerHTML = DOMPurify.sanitize(req.body.comment);

// Parameterised query — always
const user = await db.query('SELECT * FROM users WHERE name = $1', [req.query.name]);

// Safe path resolution
const safe = path.resolve('/uploads', path.basename(req.params.filename));
if (!safe.startsWith('/uploads')) throw new Error('Path traversal detected');
```

### Debug Artifact Cleanup

Leftover debugging code clutters logs and can leak sensitive information. The agent automatically strips out rogue console statements, resolves stale TODOs, and removes commented-out code blocks prior to deployment.

```
Agent scans for and removes:
  - console.log(), console.debug(), console.trace() in production paths
  - Commented-out code blocks (> 5 lines)
  - TODO/FIXME comments older than 90 days (flags, doesn't auto-delete)
  - Hardcoded localhost URLs
  - debugger; statements
  - Any variable named temp, tmp, test123, foo, bar in non-test files
```

---

## The Refactoring Report

After scanning, the agent produces a structured report outlining required fixes, warnings, and automatically applied cleanups. This report serves as a final quality dashboard for the engineering team.

```markdown
## Pre-Deployment Refactoring Report
Branch: feature/payment-v2
Scanned: 47 files changed (+2,341 / -891 lines)

### 🚨 BLOCKING (must fix before deploy)
- [security] SQL injection risk in `src/search.ts:L47` — raw interpolation
- [security] JWT secret logged in `src/auth/debug.ts:L12`

### ⚠️  WARNINGS (recommended fixes)
- [performance] O(n²) loop in `src/orders/utils.ts:L89` — 2 files affected
- [drp] Pagination logic duplicated in 5 controllers → extract to lib/
- [srp] `UserController` handles auth, email, and analytics — propose split

### ℹ️  INFO (auto-applied, review optional)
- [cleanup] Removed 3 console.log statements
- [cleanup] Removed commented-out dead code in 2 files
- [style] Extracted 2 magic numbers to constants

### ✅ AUTO-FIXED
- Removed console.log in: auth.ts, order.ts, payment.ts
- Added missing try/catch in: users.controller.ts:L34

Estimated refactoring effort for warnings: ~4 hours
```

---

## Configuring the Agent

Development teams can tune the agent's strictness by configuring thresholds, enabling/disabling specific sweeps, and defining which issues block deployment versus which are merely logged as warnings.

```yaml
# .ai-review.yml
version: 2

scan:
  - path: src/**
  - exclude: ["**/*.test.ts", "**/migrations/**"]

rules:
  drp:
    enabled: true
    duplication_threshold: 10  # lines before flagging

  solid:
    enabled: true
    max_file_lines: 400
    max_function_lines: 50
    max_cyclomatic_complexity: 15

  architecture:
    enabled: true
    max_inheritance_depth: 2
    max_dot_chain_length: 3
    flag_unused_implementations: true
    detect_over_engineering: true

  performance:
    enabled: true
    flag_on2_loops: true
    flag_missing_debounce: true

  security:
    enabled: true
    severity: critical          # block on critical

  cleanup:
    auto_remove_console_log: true
    flag_todo_older_than_days: 90

blocking_severities: [critical]
warn_severities: [high, medium]
auto_apply: [cleanup]           # only auto-apply safe, mechanical fixes
```
