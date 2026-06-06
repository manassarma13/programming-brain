---
title: "JavaScript Fundamentals"
category: "Frontend Fundamentals"
difficulty: "beginner"
tags: ["javascript", "closures", "hoisting", "prototype", "ES6", "types", "coercion", "scope"]
order: 7
---

# JavaScript Fundamentals

JavaScript is a **dynamically typed**, **prototype-based**, **single-threaded**, **multi-paradigm** language. Understanding its quirks at a deep level separates senior engineers from juniors.

---

## Types

JavaScript has **8 data types**:

| Type | `typeof` | Notes |
|---|---|---|
| `undefined` | `"undefined"` | Declared but not assigned |
| `null` | `"object"` | Historic bug; represents intentional absence |
| `boolean` | `"boolean"` | |
| `number` | `"number"` | IEEE 754 double-precision float |
| `bigint` | `"bigint"` | Arbitrary precision integers (`42n`) |
| `string` | `"string"` | Immutable UTF-16 |
| `symbol` | `"symbol"` | Unique, non-enumerable keys |
| `object` | `"object"` | Includes arrays, functions, Date, etc. |

Functions have `typeof` → `"function"` (a subtype of object).

### Type Coercion

JS coerces types implicitly when operators are applied to mixed types:

```javascript
"5" + 3       // "53"  — + prefers string concatenation
"5" - 3       // 2     — - coerces to number
"5" == 5      // true  — loose equality coerces
"5" === 5     // false — strict equality, no coercion
null == undefined  // true
null === undefined // false
[] == false   // true  — [] → "" → 0, false → 0
```

**Always use `===`** unless you explicitly want coercion.

### Falsy Values

```javascript
false, 0, -0, 0n, "", '', ``, null, undefined, NaN
```

Everything else is truthy (including `[]`, `{}`, `"0"`, `" "`).

---

## Variables — `var`, `let`, `const`

| Feature | `var` | `let` | `const` |
|---|---|---|---|
| Scope | Function | Block | Block |
| Hoisting | ✅ (initialised as `undefined`) | ✅ (TDZ — not accessible) | ✅ (TDZ) |
| Reassignable | ✅ | ✅ | ❌ |
| Re-declarable | ✅ | ❌ | ❌ |
| Global property | ✅ (`window.x`) | ❌ | ❌ |

### Temporal Dead Zone (TDZ)

`let` and `const` declarations are hoisted but not initialised. Accessing them before the declaration throws a `ReferenceError`:

```javascript
console.log(x); // ReferenceError: Cannot access 'x' before initialization
let x = 5;

console.log(y); // undefined (var is initialised to undefined)
var y = 5;
```

---

## Hoisting

**Hoisting** is the JS engine's behaviour of moving declarations to the top of their scope during the creation phase of the execution context.

```javascript
sayHi(); // works — function declarations are fully hoisted

function sayHi() {
  console.log("Hi!");
}

greet(); // TypeError: greet is not a function
var greet = function() { console.log("Hey!"); };
// var is hoisted (as undefined), but the assignment is not
```

Class declarations are hoisted but **not initialised** (TDZ applies).

---

## Scope & Closures

**Lexical scope**: a function's scope is determined by where it is *defined*, not where it is *called*.

A **closure** is a function that retains access to its outer lexical environment even after the outer function has returned.

```javascript
function makeCounter() {
  let count = 0; // lives in makeCounter's scope

  return {
    increment() { count++; },
    get()       { return count; },
  };
}

const counter = makeCounter();
counter.increment();
counter.increment();
console.log(counter.get()); // 2
// `count` is preserved via closure, not accessible externally
```

### Common Closure Pitfall — Loop Variable

```javascript
// ❌ All callbacks log 5
for (var i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}

// ✅ Fix 1: use let (block-scoped per iteration)
for (let i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}

// ✅ Fix 2: IIFE to capture value
for (var i = 0; i < 5; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 100);
  })(i);
}
```

---

## Prototype Chain

Every object has an internal `[[Prototype]]` link (accessed via `__proto__` or `Object.getPrototypeOf()`). Property lookup walks the chain.

```javascript
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} makes a sound`;
};

const dog = new Animal("Rex");
dog.speak(); // "Rex makes a sound" — found on Animal.prototype

// Chain: dog → Animal.prototype → Object.prototype → null
```

### ES6 Class Syntax (syntactic sugar over prototypes)

```javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}

class Dog extends Animal {
  speak() { return `${this.name} barks`; }
}

const d = new Dog("Rex");
d.speak();                         // "Rex barks"
d instanceof Dog;                  // true
d instanceof Animal;               // true
Object.getPrototypeOf(d) === Dog.prototype; // true
```

---

## `this` Binding

`this` is determined at **call time**, not definition time (except for arrow functions).

| Call pattern | `this` value |
|---|---|
| Regular function call `fn()` | `undefined` (strict) or `globalThis` |
| Method call `obj.fn()` | `obj` |
| `new Fn()` | The newly created object |
| `.call(ctx)` / `.apply(ctx)` / `.bind(ctx)` | `ctx` |
| Arrow function `() => {}` | Inherits `this` from enclosing lexical scope |

```javascript
const obj = {
  name: "Alice",
  greet() { console.log(this.name); }, // method — this = obj
  greetArrow: () => console.log(this?.name), // arrow — this = outer (undefined/global)
};

obj.greet();       // "Alice"
obj.greetArrow();  // undefined

const fn = obj.greet;
fn();              // undefined (strict) — detached from obj
fn.call({ name: "Bob" }); // "Bob"
```

---

## ES6+ Key Features

### Destructuring
```javascript
const { name, age = 25 } = person;
const [first, , third] = arr;
const { address: { city } } = user; // nested
```

### Spread & Rest
```javascript
const merged = { ...defaults, ...overrides };
const copy = [...original, newItem];

function sum(...nums) { return nums.reduce((a, b) => a + b, 0); }
```

### Template Literals
```javascript
const msg = `Hello, ${user.name}! You have ${count} messages.`;
```

### Optional Chaining & Nullish Coalescing
```javascript
const city = user?.address?.city;   // undefined if any link is null/undefined
const name = user.name ?? "Guest";  // "Guest" only if null or undefined (not falsy)
```

### Modules (ESM)
```javascript
// math.js
export const add = (a, b) => a + b;
export default function multiply(a, b) { return a * b; }

// main.js
import multiply, { add } from './math.js';
import * as math from './math.js';
```

---

## Immutability Patterns

```javascript
// Prevent property addition
Object.freeze(obj);    // deep freeze requires recursion
Object.seal(obj);      // can modify existing, not add/delete

// Immutable update patterns
const next = { ...prev, count: prev.count + 1 };   // object
const next = [...prev.slice(0, i), newVal, ...prev.slice(i + 1)]; // array
```

---

## Error Handling

```javascript
try {
  JSON.parse(invalidJson);
} catch (err) {
  if (err instanceof SyntaxError) {
    console.error("Invalid JSON:", err.message);
  } else {
    throw err; // re-throw unexpected errors
  }
} finally {
  cleanup(); // always runs
}
```

Custom errors:
```javascript
class AppError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}
throw new AppError("Not found", 404);
```

---

## Common Gotchas

| Gotcha | Explanation |
|---|---|
| `NaN !== NaN` | Use `Number.isNaN(x)` |
| `0.1 + 0.2 !== 0.3` | IEEE 754 float precision; use `Math.abs(a-b) < Number.EPSILON` |
| `typeof null === "object"` | Historic bug, never fixed |
| Array `sort()` default is lexicographic | Always pass a comparator: `.sort((a,b) => a-b)` |
| `arguments` not in arrow functions | Use rest params instead |
