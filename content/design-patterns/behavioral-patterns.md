---
title: "Behavioral Patterns"
category: "Design Patterns"
difficulty: "intermediate"
tags: ["observer", "strategy", "command", "state", "mediator"]
order: 3
---

# Behavioral Design Patterns

Behavioral patterns define how objects communicate, assign responsibilities, and manage control flow between collaborating objects.

## Observer Pattern

Defines a **one-to-many dependency** so that when one object changes state, all dependents are notified and updated automatically.

### Real-World Uses
- DOM event listeners, React state, Redux, RxJS
- Pub/Sub messaging, WebSocket broadcast
- Model-View-Controller (MVC)

### Implementation

```typescript
type EventHandler<T = unknown> = (data: T) => void;

class EventEmitter {
  private listeners = new Map<string, Set<EventHandler>>();

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.listeners.get(event)?.delete(handler as EventHandler);
  }

  emit<T>(event: string, data: T): void {
    this.listeners.get(event)?.forEach((handler) => handler(data));
  }

  once<T>(event: string, handler: EventHandler<T>): void {
    const wrapper: EventHandler<T> = (data) => {
      handler(data);
      this.listeners.get(event)?.delete(wrapper as EventHandler);
    };
    this.on(event, wrapper);
  }
}

// Usage
const store = new EventEmitter();

const unsubscribe = store.on<{ price: number }>("priceUpdate", (data) => {
  console.log(`New price: $${data.price}`);
});

store.emit("priceUpdate", { price: 42.5 });
unsubscribe(); // clean up
store.emit("priceUpdate", { price: 43.0 }); // no output
```

### Observer vs Pub/Sub

| Aspect | Observer | Pub/Sub |
|---|---|---|
| Coupling | Subject knows observers | Fully decoupled via broker |
| Communication | Direct method call | Message channel |
| Example | DOM events | Redis Pub/Sub, Kafka |

---

## Strategy Pattern

Defines a family of algorithms, encapsulates each one, and makes them interchangeable. The algorithm varies independently from clients that use it.

### When to Use
- Multiple algorithms for the same task (sorting, compression, validation)
- Want to swap behavior at runtime without conditionals
- Eliminate large `if/else` or `switch` blocks

### Implementation

```typescript
// Strategy interface
interface CompressionStrategy {
  compress(data: string): string;
  name: string;
}

// Concrete strategies
const gzipStrategy: CompressionStrategy = {
  name: "gzip",
  compress(data: string): string {
    return `gzip(${data.length} bytes → ${Math.floor(data.length * 0.3)} bytes)`;
  },
};

const brotliStrategy: CompressionStrategy = {
  name: "brotli",
  compress(data: string): string {
    return `brotli(${data.length} bytes → ${Math.floor(data.length * 0.2)} bytes)`;
  },
};

const noopStrategy: CompressionStrategy = {
  name: "none",
  compress(data: string): string {
    return `raw(${data.length} bytes)`;
  },
};

// Context
class FileCompressor {
  constructor(private strategy: CompressionStrategy) {}

  setStrategy(strategy: CompressionStrategy): void {
    this.strategy = strategy;
  }

  compress(data: string): string {
    console.log(`Using ${this.strategy.name} compression`);
    return this.strategy.compress(data);
  }
}

// Usage — swap at runtime
const compressor = new FileCompressor(gzipStrategy);
compressor.compress("Hello World".repeat(100));

compressor.setStrategy(brotliStrategy);
compressor.compress("Hello World".repeat(100));
```

### Strategy in Modern JavaScript

Functions as strategies — no class boilerplate needed:

```typescript
type SortStrategy<T> = (a: T, b: T) => number;

const byPrice: SortStrategy<{ price: number }> = (a, b) => a.price - b.price;
const byName: SortStrategy<{ name: string }> = (a, b) => a.name.localeCompare(b.name);
const byRating: SortStrategy<{ rating: number }> = (a, b) => b.rating - a.rating;

const products = [
  { name: "Widget", price: 25, rating: 4.5 },
  { name: "Gadget", price: 15, rating: 4.8 },
  { name: "Doohickey", price: 35, rating: 4.2 },
];

products.sort(byPrice);   // cheapest first
products.sort(byRating);  // best rated first
```

---

## Command Pattern

Encapsulates a request as an object, allowing parameterization, queuing, logging, and **undo/redo**.

```typescript
interface Command {
  execute(): void;
  undo(): void;
}

class TextEditor {
  content = "";

  append(text: string): void {
    this.content += text;
  }

  deleteLast(count: number): string {
    const deleted = this.content.slice(-count);
    this.content = this.content.slice(0, -count);
    return deleted;
  }
}

class TypeCommand implements Command {
  constructor(private editor: TextEditor, private text: string) {}

  execute(): void {
    this.editor.append(this.text);
  }

  undo(): void {
    this.editor.deleteLast(this.text.length);
  }
}

class CommandHistory {
  private stack: Command[] = [];
  private redoStack: Command[] = [];

  execute(command: Command): void {
    command.execute();
    this.stack.push(command);
    this.redoStack = []; // clear redo on new action
  }

  undo(): void {
    const command = this.stack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.stack.push(command);
    }
  }
}

// Usage
const editor = new TextEditor();
const history = new CommandHistory();

history.execute(new TypeCommand(editor, "Hello "));
history.execute(new TypeCommand(editor, "World"));
console.log(editor.content); // "Hello World"

history.undo();
console.log(editor.content); // "Hello "

history.redo();
console.log(editor.content); // "Hello World"
```

---

## State Pattern

Allows an object to alter its behavior when its internal state changes — it appears to change its class.

```typescript
interface TrafficLightState {
  name: string;
  next(light: TrafficLight): void;
  display(): string;
}

class RedState implements TrafficLightState {
  name = "RED";
  next(light: TrafficLight): void { light.setState(new GreenState()); }
  display(): string { return "🔴 STOP"; }
}

class GreenState implements TrafficLightState {
  name = "GREEN";
  next(light: TrafficLight): void { light.setState(new YellowState()); }
  display(): string { return "🟢 GO"; }
}

class YellowState implements TrafficLightState {
  name = "YELLOW";
  next(light: TrafficLight): void { light.setState(new RedState()); }
  display(): string { return "🟡 CAUTION"; }
}

class TrafficLight {
  private state: TrafficLightState;

  constructor() {
    this.state = new RedState();
  }

  setState(state: TrafficLightState): void {
    this.state = state;
  }

  next(): void {
    this.state.next(this);
  }

  display(): string {
    return this.state.display();
  }
}

const light = new TrafficLight();
console.log(light.display()); // 🔴 STOP
light.next();
console.log(light.display()); // 🟢 GO
light.next();
console.log(light.display()); // 🟡 CAUTION
```

## Pattern Selection Guide

| Need | Pattern |
|---|---|
| Notify dependents of state changes | Observer |
| Swap algorithms at runtime | Strategy |
| Undo/redo, queue operations | Command |
| Object behavior changes with state | State |
| Reduce many-to-many communication | Mediator |
| Traverse a collection without exposing internals | Iterator |
