---
title: "Call Stack & Execution Context"
category: "Frontend Fundamentals"
difficulty: "intermediate"
tags: ["call-stack", "execution-context", "scope-chain", "hoisting", "this", "variable-environment", "lexical-environment"]
order: 4
---

# Call Stack & Execution Context

This is one of the most important topics in JavaScript — everything that runs in JS flows through the call stack and execution contexts. Master this and you'll understand hoisting, closures, `this`, and async at a deep level.

---

## What Is an Execution Context?

An **Execution Context (EC)** is an abstract container that holds all information needed to execute a piece of JavaScript code. Think of it as a "world" in which code runs.

There are three types:

| Type | Created when |
|---|---|
| **Global Execution Context (GEC)** | Script first loads; there is exactly one |
| **Function Execution Context (FEC)** | Each function call creates one |
| **Eval Execution Context** | `eval()` is called (avoid in practice) |

---

## Anatomy of an Execution Context

Each EC has three components:

### 1. Variable Environment (VE)
Stores variables (`var`, function declarations) created in the current scope. In the creation phase, `var` declarations are hoisted and initialised to `undefined`.

### 2. Lexical Environment (LE)
Also stores bindings (`let`, `const`, function declarations), but adds a reference to the **outer environment** — enabling the scope chain.

```
Lexical Environment = {
  Environment Record: { x: 1, greet: fn },
  Outer:              → reference to parent LE
}
```

### 3. `this` Binding
Determined at context creation (for regular functions) or inherited (for arrow functions).

---

## Two Phases of Execution Context

Every EC is set up in **two phases**:

### Phase 1 — Creation (Memory Allocation)

The engine scans the code and:
1. Creates the **Variable Environment** — `var` declared as `undefined`, function declarations fully hoisted
2. Creates the **Lexical Environment** — `let`/`const` added to TDZ (not accessible yet)
3. Determines the **`this`** binding

```javascript
// Before any line runs, the GEC creation phase does:
// x       → undefined   (var hoisted)
// greet   → fn() {...}  (function declaration fully hoisted)
// y       → <TDZ>       (let — in temporal dead zone)

console.log(x);     // undefined (not ReferenceError)
console.log(greet); // [Function: greet]
// console.log(y);  // ReferenceError: Cannot access 'y' before initialization

var x = 10;
function greet() { return "Hello"; }
let y = 20;
```

### Phase 2 — Execution

Code runs line by line. Variables get assigned their actual values.

---

## The Call Stack

The **call stack** is a LIFO (Last In, First Out) data structure that tracks which EC is currently running.

```
Initial state:        | GEC |
                      -------

Call foo():           | foo EC |
                      | GEC    |

Inside foo, call bar: | bar EC |
                      | foo EC |
                      | GEC    |

bar returns:          | foo EC |
                      | GEC    |

foo returns:          | GEC    |
```

### Stack Overflow

The call stack has a finite size (typically ~10,000–15,000 frames in V8). Infinite recursion causes a **stack overflow**:

```javascript
function infinite() {
  return infinite(); // ← never stops
}
infinite(); // RangeError: Maximum call stack size exceeded
```

Fix with iteration, trampolining, or tail-call optimisation (TCO):

```javascript
// Trampoline pattern — prevents stack growth
function trampoline(fn) {
  return function(...args) {
    let result = fn(...args);
    while (typeof result === 'function') {
      result = result();
    }
    return result;
  };
}

const factorial = trampoline(function f(n, acc = 1) {
  return n <= 1 ? acc : () => f(n - 1, n * acc);
});

factorial(10000); // Works without stack overflow
```

---

## Scope Chain

When JS looks up a variable, it walks the **scope chain** — from the current LE outward through outer references until it finds the variable or reaches the global scope.

```javascript
const global = "global";

function outer() {
  const outerVar = "outer";

  function inner() {
    const innerVar = "inner";
    console.log(innerVar);  // found in inner's LE
    console.log(outerVar);  // not in inner's LE → walk chain → found in outer's LE
    console.log(global);    // not in inner or outer → walk chain → found in GEC
  }

  inner();
}

outer();
```

The scope chain is determined **lexically** (at code writing time), not at call time.

```
inner's LE → outer's LE → GEC → null
```

---

## Function EC Creation — Step by Step

```javascript
function greet(name) {
  var greeting = "Hello";
  let msg = greeting + ", " + name;
  return msg;
}

greet("Alice");
```

**When `greet("Alice")` is called:**

1. A new **Function Execution Context** is created
2. **Creation Phase:**
   - `name` → `"Alice"` (parameter, immediately initialised)
   - `greeting` → `undefined` (var hoisted)
   - `msg` → `<TDZ>` (let)
   - `this` → `globalThis` (or `undefined` in strict mode)
   - `outer` → reference to GEC's LE
3. **Execution Phase:**
   - `greeting = "Hello"` → assigned
   - `msg = "Hello, Alice"` → TDZ lifted, assigned
   - `return msg` → value returned, EC popped from stack

---

## Closures & the Execution Context

Closures work because the inner function's Lexical Environment holds a **reference** to the outer function's LE, even after the outer function's EC is popped from the stack.

```javascript
function makeAdder(x) {
  // makeAdder EC created, x = 5
  return function add(y) {
    // add EC has outer → makeAdder's LE (x = 5 survives!)
    return x + y;
  };
} // makeAdder EC popped — but its LE stays alive via closure

const addFive = makeAdder(5); // addFive holds ref to makeAdder's LE
addFive(3); // 8 — x found via scope chain in makeAdder's LE
```

The GC does **not** collect makeAdder's LE as long as `addFive` exists, because there's still a live reference to it through the closure.

---

## `this` Binding in Execution Contexts

`this` is bound during **EC creation**, not lexically:

```javascript
const obj = {
  value: 42,
  getValue() {
    // FEC created with this = obj (method call pattern)
    return this.value;
  },
  getValueArrow: () => {
    // Arrow function — no own this binding
    // Inherits this from enclosing LE (GEC → globalThis or undefined)
    return this?.value;
  }
};

obj.getValue();      // 42
obj.getValueArrow(); // undefined

const fn = obj.getValue;
fn(); // undefined (strict) — this = undefined, not obj
```

---

## Stack Inspection & Debugging

```javascript
// See current call stack
function a() { b(); }
function b() { c(); }
function c() {
  console.trace(); // prints stack trace
  new Error().stack; // same as string
}
a();

// Output:
// c @ script.js:3
// b @ script.js:2
// a @ script.js:1
// (anonymous) @ script.js:7
```

In Chrome DevTools → **Sources** tab → set a breakpoint → the **Call Stack** panel shows the live stack with all frames.

---

## Async & the Call Stack

Asynchronous callbacks **do not** run while another EC is on the stack. The event loop only pushes a callback onto the stack when it's empty:

```javascript
console.log("1");

setTimeout(() => {
  console.log("3"); // pushed to stack only when empty
}, 0);

console.log("2");

// Output: 1, 2, 3
// The setTimeout callback waits in the task queue
// until the stack is clear
```

See the **Event Loop & Async** article for the full picture.

---

## Summary — Mental Model

```
┌─────────────────────────────────────────┐
│              Call Stack                  │
│  ┌───────────────────────────────────┐  │
│  │ FEC: greet("Alice")               │  │
│  │  Variable Env: { name, greeting } │  │
│  │  Lexical Env: outer → GEC         │  │
│  │  this: globalThis                 │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ GEC (Global)                      │  │
│  │  Variable Env: { var x, greet }   │  │
│  │  Lexical Env: outer → null        │  │
│  │  this: globalThis / window        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```
