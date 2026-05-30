---
title: "Creational Patterns"
category: "Design Patterns"
difficulty: "intermediate"
tags: ["singleton", "factory", "abstract-factory", "builder", "prototype"]
order: 1
---

# Creational Design Patterns

Creational patterns abstract the instantiation process — they help make a system independent of how its objects are created, composed, and represented.

## Singleton

Ensures a class has exactly **one instance** with a global access point.

### When to Use
- Logging services, config managers, connection pools, caches
- Any resource that is expensive to create and must be shared

### Implementation

```typescript
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private connectionString: string;

  // Private constructor prevents external instantiation
  private constructor(connectionString: string) {
    this.connectionString = connectionString;
    console.log(`Connecting to ${connectionString}...`);
  }

  static getInstance(connectionString = "postgresql://localhost:5432/app"): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(connectionString);
    }
    return DatabaseConnection.instance;
  }

  query(sql: string): void {
    console.log(`[${this.connectionString}] Executing: ${sql}`);
  }
}

// Usage — same instance every time
const db1 = DatabaseConnection.getInstance();
const db2 = DatabaseConnection.getInstance();
console.log(db1 === db2); // true
```

### Trade-offs

| Pros | Cons |
|---|---|
| Controlled access to single instance | Global state — hard to test |
| Lazy initialization | Violates SRP (controls own lifecycle) |
| Reduced memory footprint | Thread safety concerns in multi-threaded envs |

### Modern Alternative: Module-level singleton

```typescript
// db.ts — In ES modules, this file IS the singleton
const connection = createConnection("postgresql://localhost:5432/app");
export default connection;
```

---

## Factory Method

Defines an interface for creating objects, letting subclasses decide which class to instantiate.

### When to Use
- You don't know ahead of time which concrete class you need
- You want to centralize and encapsulate creation logic
- Framework code that delegates instantiation to user code

### Implementation

```typescript
// Product interface
interface Notification {
  send(message: string): void;
}

// Concrete products
class EmailNotification implements Notification {
  send(message: string): void {
    console.log(`📧 Email: ${message}`);
  }
}

class SMSNotification implements Notification {
  send(message: string): void {
    console.log(`📱 SMS: ${message}`);
  }
}

class PushNotification implements Notification {
  send(message: string): void {
    console.log(`🔔 Push: ${message}`);
  }
}

// Factory
class NotificationFactory {
  static create(channel: "email" | "sms" | "push"): Notification {
    switch (channel) {
      case "email": return new EmailNotification();
      case "sms":   return new SMSNotification();
      case "push":  return new PushNotification();
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }
}

// Usage
const notif = NotificationFactory.create("email");
notif.send("Your order has shipped!");
```

### Abstract Factory Extension

When you need families of related objects:

```typescript
interface UIFactory {
  createButton(): Button;
  createInput(): Input;
}

class DarkThemeFactory implements UIFactory {
  createButton(): Button { return new DarkButton(); }
  createInput(): Input { return new DarkInput(); }
}

class LightThemeFactory implements UIFactory {
  createButton(): Button { return new LightButton(); }
  createInput(): Input { return new LightInput(); }
}

// Client code works with any theme — no conditionals
function renderForm(factory: UIFactory) {
  const button = factory.createButton();
  const input = factory.createInput();
  button.render();
  input.render();
}
```

---

## Builder

Separates construction of a complex object from its representation, allowing the same construction process to create different representations.

### When to Use
- Objects with many optional parameters (avoids telescoping constructors)
- Step-by-step construction
- Immutable objects that need a mutable build phase

### Implementation

```typescript
class HttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: string | null;
  readonly timeout: number;
  readonly retries: number;

  private constructor(builder: HttpRequestBuilder) {
    this.method = builder.method;
    this.url = builder.url;
    this.headers = { ...builder.headers };
    this.body = builder.body;
    this.timeout = builder.timeout;
    this.retries = builder.retries;
  }

  static builder(method: string, url: string): HttpRequestBuilder {
    return new HttpRequestBuilder(method, url);
  }
}

class HttpRequestBuilder {
  method: string;
  url: string;
  headers: Record<string, string> = {};
  body: string | null = null;
  timeout = 30000;
  retries = 0;

  constructor(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this; // fluent interface
  }

  setBody(body: string): this {
    this.body = body;
    return this;
  }

  setTimeout(ms: number): this {
    this.timeout = ms;
    return this;
  }

  setRetries(n: number): this {
    this.retries = n;
    return this;
  }

  build(): HttpRequest {
    return new (HttpRequest as any)(this);
  }
}

// Usage — readable, self-documenting
const request = HttpRequest.builder("POST", "/api/users")
  .setHeader("Content-Type", "application/json")
  .setHeader("Authorization", "Bearer token123")
  .setBody(JSON.stringify({ name: "Alice" }))
  .setTimeout(5000)
  .setRetries(3)
  .build();
```

## Pattern Selection Guide

| Need | Pattern |
|---|---|
| Exactly one instance | Singleton |
| Decouple creation from usage | Factory Method |
| Families of related objects | Abstract Factory |
| Complex object, many optional params | Builder |
| Clone existing objects | Prototype (`structuredClone()`) |
