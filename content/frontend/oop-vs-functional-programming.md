---
title: "OOP vs Functional Programming in JavaScript"
category: "Frontend Fundamentals"
difficulty: "intermediate"
tags: ["OOP", "functional", "classes", "inheritance", "composition", "pure-functions", "immutability", "higher-order", "SOLID", "FP"]
order: 8
---

# OOP vs Functional Programming in JavaScript

JavaScript is a **multi-paradigm** language — it supports Object-Oriented Programming, Functional Programming, and procedural styles, often mixed in the same codebase. Understanding each deeply — and knowing when to reach for which — is a mark of a senior engineer.

---

## Object-Oriented Programming (OOP)

OOP organises code around **objects** — entities that bundle **state** (data) and **behaviour** (methods) together.

### The Four Pillars

#### 1. Encapsulation — Hide implementation details

```javascript
class BankAccount {
  #balance; // private field (ES2022)
  #transactionLog = [];

  constructor(initialBalance) {
    this.#balance = initialBalance;
  }

  deposit(amount) {
    if (amount <= 0) throw new Error('Amount must be positive');
    this.#balance += amount;
    this.#transactionLog.push({ type: 'deposit', amount });
  }

  withdraw(amount) {
    if (amount > this.#balance) throw new Error('Insufficient funds');
    this.#balance -= amount;
    this.#transactionLog.push({ type: 'withdrawal', amount });
  }

  get balance() { return this.#balance; } // read-only accessor
}

const account = new BankAccount(1000);
account.deposit(500);
account.balance;    // 1500
account.#balance;   // SyntaxError — truly private
```

#### 2. Inheritance — Share behaviour through a hierarchy

```javascript
class Shape {
  constructor(color) { this.color = color; }
  area() { throw new Error('area() must be implemented'); }
  describe() { return `A ${this.color} shape with area ${this.area().toFixed(2)}`; }
}

class Circle extends Shape {
  constructor(color, radius) {
    super(color); // must call super before using `this`
    this.radius = radius;
  }
  area() { return Math.PI * this.radius ** 2; }
}

class Rectangle extends Shape {
  constructor(color, w, h) {
    super(color);
    this.width = w;
    this.height = h;
  }
  area() { return this.width * this.height; }
}

const shapes = [new Circle('red', 5), new Rectangle('blue', 4, 6)];
shapes.forEach(s => console.log(s.describe()));
```

#### 3. Polymorphism — Same interface, different behaviour

The `describe()` method above works on any `Shape` subclass — that's polymorphism. The correct `area()` is called at runtime based on the actual type.

```javascript
// Duck typing polymorphism (no explicit inheritance needed in JS)
function makeSound(animal) {
  return animal.speak(); // works if .speak() exists
}

makeSound({ speak: () => 'Woof!' });  // works
makeSound({ speak: () => 'Meow!' }); // works
```

#### 4. Abstraction — Expose only what is necessary

```javascript
class ApiClient {
  #baseUrl;
  #token;

  constructor(baseUrl, token) {
    this.#baseUrl = baseUrl;
    this.#token = token;
  }

  async getUser(id) {
    // Caller doesn't know about headers, retry logic, etc.
    return this.#request(`/users/${id}`);
  }

  async #request(path) { // private method
    const res = await fetch(this.#baseUrl + path, {
      headers: { Authorization: `Bearer ${this.#token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
```

---

## SOLID Principles (OOP)

| Principle | Meaning | JS Example |
|---|---|---|
| **S**ingle Responsibility | A class does one thing | `UserValidator` only validates; `UserRepository` only persists |
| **O**pen/Closed | Open for extension, closed for modification | Use inheritance or strategy pattern |
| **L**iskov Substitution | Subclasses can replace parent without breaking | `Circle extends Shape` — substitutable anywhere Shape is used |
| **I**nterface Segregation | Don't force unused methods | Split large interfaces into focused ones |
| **D**ependency Inversion | Depend on abstractions, not concretions | Inject a `logger` interface, not `console` directly |

```javascript
// ❌ Violates SRP — does too much
class User {
  save() { /* db logic */ }
  sendEmail() { /* email logic */ }
  generateReport() { /* report logic */ }
}

// ✅ SRP — each class has one reason to change
class UserRepository { save(user) { /* db */ } }
class EmailService { send(user) { /* email */ } }
class UserReportGenerator { generate(user) { /* report */ } }
```

---

## Composition over Inheritance

Deep inheritance chains are fragile (the **fragile base class problem**). Prefer composing small, focused units of behaviour:

```javascript
// Mixins — compose behaviour without inheritance
const Serializable = (Base) => class extends Base {
  serialize() { return JSON.stringify(this); }
  static deserialize(json) { return Object.assign(new this(), JSON.parse(json)); }
};

const Timestamped = (Base) => class extends Base {
  constructor(...args) {
    super(...args);
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
  touch() { this.updatedAt = new Date(); }
};

class User {
  constructor(name) { this.name = name; }
}

class TimestampedSerializableUser extends Timestamped(Serializable(User)) {}

const user = new TimestampedSerializableUser('Alice');
user.serialize(); // JSON string
```

---

## Functional Programming (FP)

FP treats computation as the **evaluation of mathematical functions**. It emphasises:
- **Pure functions** — no side effects, deterministic output
- **Immutability** — data never mutated, new values created
- **Function composition** — build complex logic from simple functions
- **First-class functions** — functions are values

### Pure Functions

```javascript
// ❌ Impure — depends on external state, has side effects
let total = 0;
function addToTotal(n) {
  total += n; // mutates external state
  console.log(total); // side effect
}

// ✅ Pure — same input → same output, no side effects
function add(a, b) { return a + b; }

// ✅ Pure — returns new array instead of mutating
function appendItem(arr, item) { return [...arr, item]; }
```

### Immutability

```javascript
// ❌ Mutation
const user = { name: 'Alice', age: 30 };
user.age = 31; // mutates original

// ✅ Immutable update
const updatedUser = { ...user, age: 31 };

// ❌ Array mutation
arr.push(4);
arr.splice(1, 1);

// ✅ Immutable equivalents
const newArr = [...arr, 4];
const withoutIndex = arr.filter((_, i) => i !== 1);
```

### Higher-Order Functions

Functions that take or return other functions:

```javascript
// map, filter, reduce — the FP holy trinity
const users = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 25, active: false },
  { name: 'Carol', age: 35, active: true },
];

const result = users
  .filter(u => u.active)                    // keep active users
  .map(u => ({ ...u, name: u.name.toUpperCase() })) // transform
  .reduce((acc, u) => acc + u.age, 0);    // aggregate

// Custom HOF
function withLogging(fn) {
  return function(...args) {
    console.log(`Calling with:`, args);
    const result = fn(...args);
    console.log(`Result:`, result);
    return result;
  };
}

const loggedAdd = withLogging(add);
loggedAdd(2, 3); // logs and returns 5
```

### Currying

Transform a multi-argument function into a chain of single-argument functions:

```javascript
// Manual currying
const multiply = (a) => (b) => a * b;
const double = multiply(2);
const triple = multiply(3);

double(5); // 10
triple(5); // 15
[1, 2, 3, 4].map(double); // [2, 4, 6, 8]

// General curry utility
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function(...args2) {
      return curried.apply(this, args.concat(args2));
    };
  };
}

const curriedAdd = curry((a, b, c) => a + b + c);
curriedAdd(1)(2)(3); // 6
curriedAdd(1, 2)(3); // 6
curriedAdd(1)(2, 3); // 6
```

### Function Composition

```javascript
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);
const pipe    = (...fns) => x => fns.reduce((v, f) => f(v), x);

const trim      = s => s.trim();
const lowercase = s => s.toLowerCase();
const slugify   = s => s.replace(/\s+/g, '-');

const toSlug = pipe(trim, lowercase, slugify);
toSlug('  Hello World  '); // "hello-world"
```

### Functors & Monads (Conceptual)

A **functor** is something you can `map` over — arrays are functors.
A **monad** wraps a value and provides a `flatMap` (chain) operation:

```javascript
// Option/Maybe monad — safe null handling
class Maybe {
  constructor(value) { this.value = value; }

  static of(value) { return new Maybe(value); }
  isNothing() { return this.value == null; }

  map(fn) {
    return this.isNothing() ? this : Maybe.of(fn(this.value));
  }

  flatMap(fn) {
    return this.isNothing() ? this : fn(this.value);
  }

  getOrElse(defaultValue) {
    return this.isNothing() ? defaultValue : this.value;
  }
}

const getCity = user =>
  Maybe.of(user)
    .map(u => u.address)
    .map(a => a.city)
    .getOrElse('Unknown');

getCity({ address: { city: 'Tokyo' } }); // "Tokyo"
getCity({ address: null });              // "Unknown"
getCity(null);                           // "Unknown"
```

---

## OOP vs FP — Side-by-Side

| Dimension | OOP | Functional |
|---|---|---|
| State | Encapsulated in objects | Avoided; passed through functions |
| Data | Mutable (methods modify `this`) | Immutable (returns new values) |
| Code reuse | Inheritance + interfaces | Composition + HOFs |
| Unit of abstraction | Class / object | Function |
| Side effects | Common (methods update state) | Avoided; pushed to edges |
| Concurrency | Challenging (shared mutable state) | Natural (no shared state) |
| Testing | Mock objects, test in isolation | Pure functions are trivially testable |
| Readability | Good for modelling real-world entities | Good for data pipelines |

---

## When to Use Which

### Prefer OOP when:
- Modelling entities with identity (User, Order, BankAccount)
- Building frameworks or APIs where users extend your types
- State transitions are complex (game entities, UI component trees)
- Team is familiar with OOP patterns

### Prefer FP when:
- Data transformation pipelines (e.g. ETL, analytics)
- Business logic that should be side-effect free and testable
- React/Redux style state management (reducers are pure functions)
- Concurrency-heavy code (no shared mutable state)

### In Practice — Hybrid Approach

Most production JavaScript codebases use **both**:

```javascript
// Class for the "thing" (OOP)
class ShoppingCart {
  #items = [];

  addItem(item) {
    // Pure function inside OOP method (FP)
    this.#items = addItemToCart(this.#items, item);
    return this;
  }

  get total() {
    return calculateTotal(this.#items); // pure
  }
}

// Pure FP functions — easily testable
const addItemToCart = (items, item) => [...items, item];
const calculateTotal = (items) =>
  items.reduce((sum, item) => sum + item.price * item.qty, 0);
```

React itself is a hybrid: **classes** (historically) or **functions** for components, **immutable state** updates, **pure render** functions — FP principles inside OOP structure.

---

## Prototype-Based vs Class-Based OOP

JavaScript's OOP is **prototype-based** — objects inherit directly from other objects. ES6 `class` syntax is syntactic sugar over prototypes.

```javascript
// Prototype style (ES5)
function Vehicle(type) { this.type = type; }
Vehicle.prototype.describe = function() { return `I'm a ${this.type}`; };

function Car(brand) {
  Vehicle.call(this, 'car');
  this.brand = brand;
}
Car.prototype = Object.create(Vehicle.prototype);
Car.prototype.constructor = Car;

// ES6 class (same prototype chain underneath)
class Car extends Vehicle {
  constructor(brand) {
    super('car');
    this.brand = brand;
  }
}

// Object.create — direct prototypal inheritance (no constructor function)
const animal = {
  speak() { return `${this.name} speaks`; }
};
const dog = Object.create(animal);
dog.name = 'Rex';
dog.speak(); // "Rex speaks"
```
