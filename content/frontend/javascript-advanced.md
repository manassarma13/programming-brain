---
title: "JavaScript Advanced"
category: "Frontend Fundamentals"
difficulty: "advanced"
tags: ["generators", "iterators", "proxy", "reflect", "WeakRef", "FinalizationRegistry", "SharedArrayBuffer", "Atomics", "symbols", "metaprogramming"]
order: 8
---

# JavaScript Advanced

These are the concepts that separate senior engineers from the rest. They underpin frameworks, compilers, and runtime-level patterns.

---

## Iterators & the Iteration Protocol

An object is **iterable** if it has a `[Symbol.iterator]()` method returning an **iterator** (object with a `next()` method).

```javascript
// A custom iterable range
class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next() {
        return current <= end
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      },
    };
  }
}

const r = new Range(1, 5);
[...r];              // [1, 2, 3, 4, 5]
for (const n of r) console.log(n); // 1 2 3 4 5
const [a, b] = r;   // destructuring also uses the protocol
```

Built-in iterables: `Array`, `String`, `Map`, `Set`, `arguments`, `NodeList`, generator objects.

---

## Generators

A **generator function** (`function*`) returns a generator object — an iterator that can **pause** and **resume** execution via `yield`.

```javascript
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

const fib = fibonacci();
fib.next(); // { value: 0, done: false }
fib.next(); // { value: 1, done: false }
fib.next(); // { value: 1, done: false }

// Take first 10 fibonacci numbers
function take(iter, n) {
  const result = [];
  for (const val of iter) {
    result.push(val);
    if (result.length === n) break;
  }
  return result;
}
take(fibonacci(), 10); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

### Two-Way Communication

`next(value)` sends a value back INTO the generator (received as the result of the `yield` expression):

```javascript
function* adder() {
  let total = 0;
  while (true) {
    const n = yield total; // pauses here; resumes with n = passed value
    total += n;
  }
}

const gen = adder();
gen.next();    // { value: 0 } — initialise
gen.next(5);   // { value: 5 }
gen.next(3);   // { value: 8 }
gen.next(10);  // { value: 18 }
```

### Async Generators

```javascript
async function* streamData(url) {
  const res = await fetch(url);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    yield decoder.decode(value);
  }
}

for await (const chunk of streamData('/api/stream')) {
  process(chunk);
}
```

---

## Proxy & Reflect

**Proxy** wraps an object and intercepts operations (get, set, delete, function call, etc.) via **traps**. **Reflect** provides default implementations of those operations.

```javascript
const handler = {
  get(target, prop, receiver) {
    console.log(`Getting: ${prop}`);
    return Reflect.get(target, prop, receiver); // default behaviour
  },
  set(target, prop, value, receiver) {
    if (typeof value !== 'number') throw new TypeError('Must be a number');
    console.log(`Setting ${prop} = ${value}`);
    return Reflect.set(target, prop, value, receiver);
  },
  deleteProperty(target, prop) {
    console.log(`Deleting: ${prop}`);
    return Reflect.deleteProperty(target, prop);
  },
};

const obj = new Proxy({}, handler);
obj.x = 42;       // "Setting x = 42"
obj.x;            // "Getting: x" → 42
obj.x = "hello";  // TypeError: Must be a number
```

### Practical: Reactive State (like Vue 3)

```javascript
function reactive(target) {
  return new Proxy(target, {
    set(obj, key, value) {
      const result = Reflect.set(obj, key, value);
      trigger(obj, key); // notify subscribers
      return result;
    },
    get(obj, key) {
      track(obj, key); // collect dependencies
      return Reflect.get(obj, key);
    },
  });
}
```

### Proxy Traps Reference

| Trap | Intercepts |
|---|---|
| `get` | `obj.prop`, `obj[prop]` |
| `set` | `obj.prop = val` |
| `has` | `'prop' in obj` |
| `deleteProperty` | `delete obj.prop` |
| `apply` | `fn()` (for function proxies) |
| `construct` | `new Fn()` |
| `ownKeys` | `Object.keys()`, `for...in` |
| `defineProperty` | `Object.defineProperty()` |
| `getPrototypeOf` | `Object.getPrototypeOf()` |

---

## Symbols

Symbols are **unique, non-enumerable** values. Used as property keys that won't clash.

```javascript
const id = Symbol('id');
const obj = { [id]: 42, name: 'Alice' };

Object.keys(obj);              // ['name'] — symbols excluded
Object.getOwnPropertySymbols(obj); // [Symbol(id)]
Reflect.ownKeys(obj);          // ['name', Symbol(id)]
```

### Well-Known Symbols

| Symbol | Controls |
|---|---|
| `Symbol.iterator` | `for...of`, spread, destructuring |
| `Symbol.toPrimitive` | Type coercion (`+`, `-`, template literals) |
| `Symbol.hasInstance` | `instanceof` |
| `Symbol.toStringTag` | `Object.prototype.toString` output |
| `Symbol.asyncIterator` | `for await...of` |
| `Symbol.species` | Default constructor for derived objects |

```javascript
class Temperature {
  constructor(celsius) { this.celsius = celsius; }

  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return this.celsius;
    if (hint === 'string') return `${this.celsius}°C`;
    return this.celsius;
  }
}

const temp = new Temperature(100);
+temp;         // 100
`${temp}`;     // "100°C"
temp > 50;     // true
```

---

## WeakRef & FinalizationRegistry

`WeakRef` holds a **weak reference** to an object — doesn't prevent GC.
`FinalizationRegistry` runs a callback when a weakly-referenced object is collected.

```javascript
// Use case: optional caching
class ImageCache {
  #cache = new Map();

  set(key, img) {
    this.#cache.set(key, new WeakRef(img));
  }

  get(key) {
    return this.#cache.get(key)?.deref(); // undefined if GC'd
  }
}

// FinalizationRegistry — cleanup on GC
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`${heldValue} was garbage collected`);
});

let obj = { data: 'important' };
registry.register(obj, 'myObject');

obj = null; // eligible for GC
// Later: "myObject was garbage collected" (timing is non-deterministic)
```

> ⚠️ GC timing is non-deterministic. Never rely on `FinalizationRegistry` for critical cleanup (use `try/finally` or `using` instead).

---

## SharedArrayBuffer & Atomics

Enable true **shared memory** between the main thread and Web Workers:

```javascript
// main.js
const buffer = new SharedArrayBuffer(4); // 4 bytes
const view = new Int32Array(buffer);

const worker = new Worker('./worker.js');
worker.postMessage({ buffer }); // send reference (not copy)

// Atomically read value set by worker
Atomics.wait(view, 0, 0, 2000); // wait until view[0] !== 0, or 2s
console.log('Worker wrote:', view[0]);

// worker.js
self.onmessage = ({ data: { buffer } }) => {
  const view = new Int32Array(buffer);
  // Atomic write — safe across threads
  Atomics.store(view, 0, 42);
  Atomics.notify(view, 0, 1); // wake up one waiter
};
```

### Atomics Methods

| Method | Description |
|---|---|
| `Atomics.load(view, i)` | Atomic read |
| `Atomics.store(view, i, val)` | Atomic write |
| `Atomics.add(view, i, val)` | Atomic read-modify-write |
| `Atomics.compareExchange(view, i, expected, replacement)` | CAS operation |
| `Atomics.wait(view, i, value, timeout)` | Block until value changes |
| `Atomics.notify(view, i, count)` | Wake up waiting threads |

> `SharedArrayBuffer` requires cross-origin isolation: `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`.

---

## Tagged Template Literals

Template literals can be "tagged" with a function — powerful for DSLs:

```javascript
function sql(strings, ...values) {
  const query = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] !== undefined ? `$${i}` : '');
  }, '');
  return { query, params: values };
}

const userId = 42;
const { query, params } = sql`SELECT * FROM users WHERE id = ${userId}`;
// query: "SELECT * FROM users WHERE id = $1"
// params: [42]
// → safe parameterised queries, no SQL injection!
```

Used by: `styled-components`, `graphql-tag`, `lit-html`.

---

## Property Descriptors

Every property has an underlying descriptor:

```javascript
Object.defineProperty(obj, 'secret', {
  value: 42,
  writable: false,    // cannot reassign
  enumerable: false,  // hidden from for...in and Object.keys
  configurable: false // cannot redefine or delete
});

// Getter/setter
Object.defineProperty(obj, 'fullName', {
  get() { return `${this.first} ${this.last}`; },
  set(val) { [this.first, this.last] = val.split(' '); },
  enumerable: true,
  configurable: true,
});
```

---

## `using` — Explicit Resource Management (ES2025)

The `using` declaration automatically calls `[Symbol.dispose]()` when scope exits:

```javascript
class DatabaseConnection {
  constructor(url) { this.conn = openConnection(url); }
  query(sql) { return this.conn.execute(sql); }
  [Symbol.dispose]() { this.conn.close(); console.log('Connection closed'); }
}

{
  using db = new DatabaseConnection('postgres://...');
  db.query('SELECT 1');
} // db[Symbol.dispose]() called automatically — even on throw
```

`await using` for async disposal (`[Symbol.asyncDispose]()`).

---

## Decorators (Stage 3)

```javascript
function logged(fn, context) {
  return function(...args) {
    console.log(`Calling ${context.name}`);
    const result = fn.apply(this, args);
    console.log(`${context.name} returned`, result);
    return result;
  };
}

class Calculator {
  @logged
  add(a, b) { return a + b; }
}

new Calculator().add(2, 3);
// Calling add
// add returned 5
```
