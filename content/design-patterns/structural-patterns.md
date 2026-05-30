---
title: "Structural Patterns"
category: "Design Patterns"
difficulty: "intermediate"
tags: ["adapter", "decorator", "facade", "proxy", "composite"]
order: 2
---

# Structural Design Patterns

Structural patterns compose classes and objects into larger structures while keeping them flexible and efficient.

## Adapter Pattern

Converts the interface of a class into another interface that clients expect. Lets incompatible interfaces work together.

### Real-World Analogy
A power adapter that lets a US plug work in a European outlet.

### Implementation

```typescript
// Legacy payment system (third-party, can't modify)
class LegacyPaymentGateway {
  makePayment(amount: number, currency: string): string {
    return `Legacy payment of ${amount} ${currency} processed`;
  }
}

// Modern interface our app expects
interface PaymentProcessor {
  charge(amountCents: number): Promise<{ success: boolean; txId: string }>;
}

// Adapter bridges the gap
class LegacyPaymentAdapter implements PaymentProcessor {
  private legacy: LegacyPaymentGateway;

  constructor(legacy: LegacyPaymentGateway) {
    this.legacy = legacy;
  }

  async charge(amountCents: number): Promise<{ success: boolean; txId: string }> {
    const amountDollars = amountCents / 100;
    const result = this.legacy.makePayment(amountDollars, "USD");
    return {
      success: result.includes("processed"),
      txId: `legacy-${Date.now()}`,
    };
  }
}

// Client code — doesn't know about legacy system
async function processOrder(processor: PaymentProcessor, amount: number) {
  const result = await processor.charge(amount);
  console.log(result.success ? "✅ Charged" : "❌ Failed");
}

// Wiring
const adapter = new LegacyPaymentAdapter(new LegacyPaymentGateway());
processOrder(adapter, 2999); // $29.99
```

### When to Use
- Integrating legacy or third-party code with a modern interface
- Wrapping an API whose interface you can't change
- Creating a unified interface for multiple similar services

---

## Decorator Pattern

Dynamically attaches additional responsibilities to an object without modifying its structure. Preferred over subclassing for flexible feature composition.

### Implementation

```typescript
// Base interface
interface Logger {
  log(message: string): void;
}

// Concrete component
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }
}

// Decorators — each adds one concern
class TimestampDecorator implements Logger {
  constructor(private wrapped: Logger) {}

  log(message: string): void {
    const timestamp = new Date().toISOString();
    this.wrapped.log(`[${timestamp}] ${message}`);
  }
}

class UpperCaseDecorator implements Logger {
  constructor(private wrapped: Logger) {}

  log(message: string): void {
    this.wrapped.log(message.toUpperCase());
  }
}

class JsonDecorator implements Logger {
  constructor(private wrapped: Logger) {}

  log(message: string): void {
    this.wrapped.log(JSON.stringify({ message, level: "info" }));
  }
}

// Compose decorators like building blocks
let logger: Logger = new ConsoleLogger();
logger = new TimestampDecorator(logger);
logger = new UpperCaseDecorator(logger);
logger.log("server started");
// Output: [2024-01-15T10:30:00.000Z] SERVER STARTED
```

### Decorator vs Inheritance

| Aspect | Decorator | Inheritance |
|---|---|---|
| Composition | Runtime, flexible | Compile-time, rigid |
| Number of combinations | Mix & match N decorators | 2^N subclasses |
| Open/Closed Principle | ✅ Add features without modifying | ❌ Must modify hierarchy |
| Complexity | Wrapping chain | Deep class hierarchies |

### Real-World Uses
- Express/Koa middleware chains
- React Higher-Order Components (HOCs)
- Java I/O streams: `BufferedReader(InputStreamReader(FileInputStream(...)))`

---

## Facade Pattern

Provides a simplified interface to a complex subsystem.

```typescript
// Complex subsystems
class VideoDecoder {
  decode(file: string) { return `decoded:${file}`; }
}
class AudioMixer {
  mix(audio: string) { return `mixed:${audio}`; }
}
class Renderer {
  render(video: string, audio: string) {
    return `rendering ${video} with ${audio}`;
  }
}

// Facade — single entry point
class MediaPlayerFacade {
  private decoder = new VideoDecoder();
  private mixer = new AudioMixer();
  private renderer = new Renderer();

  play(file: string): string {
    const video = this.decoder.decode(file);
    const audio = this.mixer.mix(file);
    return this.renderer.render(video, audio);
  }
}

// Client doesn't need to know about subsystems
const player = new MediaPlayerFacade();
player.play("movie.mp4");
```

---

## Proxy Pattern

Controls access to another object — adds lazy loading, caching, logging, or access control.

```typescript
interface ImageLoader {
  display(): void;
}

class RealImage implements ImageLoader {
  constructor(private filename: string) {
    this.loadFromDisk(); // expensive
  }
  private loadFromDisk(): void {
    console.log(`Loading ${this.filename} from disk...`);
  }
  display(): void {
    console.log(`Displaying ${this.filename}`);
  }
}

// Lazy-loading proxy — defers creation until needed
class ImageProxy implements ImageLoader {
  private real: RealImage | null = null;
  constructor(private filename: string) {}

  display(): void {
    if (!this.real) {
      this.real = new RealImage(this.filename); // load on first use
    }
    this.real.display();
  }
}

const img = new ImageProxy("photo.jpg");
// No loading yet...
img.display(); // NOW it loads and displays
img.display(); // Cached — just displays
```

## Pattern Selection Guide

| Need | Pattern |
|---|---|
| Make incompatible interfaces work together | Adapter |
| Add responsibilities without subclassing | Decorator |
| Simplify a complex subsystem | Facade |
| Control access, lazy load, cache | Proxy |
| Treat individual & composite objects uniformly | Composite |
