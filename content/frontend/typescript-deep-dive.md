---
title: "TypeScript Deep Dive"
category: "Frontend Fundamentals"
difficulty: "intermediate"
tags: ["TypeScript", "generics", "utility-types", "type-guards", "conditional-types", "mapped-types", "decorators", "inference"]
order: 16
---

# TypeScript Deep Dive

TypeScript is a superset of JavaScript that adds a powerful static type system. Beyond basic annotations, TypeScript has a rich type algebra that lets you express complex constraints, transform types, and make impossible states unrepresentable.

---

## Why TypeScript

```typescript
// Without TypeScript — runtime error discovered in production
function getUser(id) {
  return fetch(`/api/users/${id}`).then(r => r.json());
}
getUser(null); // 💥 /api/users/null — bug in production

// With TypeScript — caught at compile time
function getUser(id: number): Promise<User> {
  return fetch(`/api/users/${id}`).then(r => r.json());
}
getUser(null); // ❌ Argument of type 'null' is not assignable to 'number'
```

TypeScript's value proposition: **move errors from runtime to compile time**. This pays dividends in large codebases where you can't hold the entire system in your head.

---

## Type System Fundamentals

### Structural Typing

TypeScript uses **structural typing** (duck typing), not nominal typing. Two types are compatible if they have the same shape:

```typescript
interface Point2D { x: number; y: number; }
interface Vector  { x: number; y: number; }

function distance(p: Point2D): number {
  return Math.sqrt(p.x ** 2 + p.y ** 2);
}

const v: Vector = { x: 3, y: 4 };
distance(v); // ✅ works — same shape as Point2D
```

### Union & Intersection Types

```typescript
// Union — A OR B
type StringOrNumber = string | number;
type Status = 'idle' | 'loading' | 'success' | 'error';

// Intersection — A AND B (has all properties of both)
type Admin = User & { permissions: string[] };

// Discriminated Union — exhaustive pattern matching
type Shape =
  | { kind: 'circle';    radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle';  base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':    return Math.PI * shape.radius ** 2;
    case 'rectangle': return shape.width * shape.height;
    case 'triangle':  return 0.5 * shape.base * shape.height;
    // TypeScript ensures all cases are handled — if you add a new Shape variant
    // without handling it here, you get a compile error
  }
}
```

---

## Generics

Generics let you write functions and types that work with **any type while preserving type information**:

```typescript
// Generic function
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const n = first([1, 2, 3]);    // TypeScript infers T = number → n: number | undefined
const s = first(['a', 'b']);   // T = string → s: string | undefined

// Generic with constraint
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Alice', age: 30 };
getProperty(user, 'name');    // ✅ returns string
getProperty(user, 'missing'); // ❌ compile error — 'missing' not in keyof user

// Generic interface
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}

class UserRepository implements Repository<User, number> {
  async findById(id: number): Promise<User | null> { ... }
  // TypeScript enforces all methods are implemented with correct types
}
```

---

## Utility Types

TypeScript ships a rich set of generic type transformers:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

// Partial<T> — all properties optional
type UserPatch = Partial<User>;
// { id?: number; name?: string; email?: string; ... }

// Required<T> — all properties required (opposite of Partial)
// Readonly<T> — all properties readonly
type ImmutableUser = Readonly<User>;

// Pick<T, K> — select specific properties
type PublicUser = Pick<User, 'id' | 'name' | 'email'>;

// Omit<T, K> — exclude specific properties
type SafeUser = Omit<User, 'password'>;

// Record<K, V> — object with keys K and values V
const cache: Record<string, User> = {};
const statusMessages: Record<'idle' | 'loading' | 'error', string> = {
  idle: 'Ready',
  loading: 'Loading...',
  error: 'Something went wrong',
};

// Extract<T, U> / Exclude<T, U>
type NumberOrString = number | string | boolean;
type OnlyNumbers = Extract<NumberOrString, number>;       // number
type NoBoolean   = Exclude<NumberOrString, boolean>;     // number | string

// NonNullable<T>
type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>;          // string

// ReturnType<T> — extract function return type
async function fetchUser(): Promise<User> { ... }
type FetchedUser = Awaited<ReturnType<typeof fetchUser>>; // User

// Parameters<T> — extract function params as tuple
function createUser(name: string, age: number, admin: boolean): User { ... }
type CreateUserParams = Parameters<typeof createUser>; // [string, number, boolean]
```

---

## Conditional Types

Types can have branches based on conditions:

```typescript
// T extends U ? TrueType : FalseType
type IsArray<T> = T extends any[] ? true : false;
type A = IsArray<string[]>; // true
type B = IsArray<string>;   // false

// infer — extract a type within a conditional
type ArrayElement<T> = T extends (infer E)[] ? E : never;
type E = ArrayElement<string[]>; // string

type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
// Recursively unwrap: Promise<Promise<string>> → string

// Distributive conditional types — distributes over unions
type NonNullable<T> = T extends null | undefined ? never : T;
// NonNullable<string | null | undefined> = string
```

---

## Mapped Types

Transform all properties of a type programmatically:

```typescript
// Make all properties optional (reimplementing Partial)
type Optional<T> = { [K in keyof T]?: T[K] };

// Make all properties nullable
type Nullable<T> = { [K in keyof T]: T[K] | null };

// Make specific properties required, rest optional
type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
type UserWithEmail = WithRequired<Partial<User>, 'email'>;

// Remap keys
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};
type UserGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }
```

---

## Type Guards & Narrowing

TypeScript narrows types based on control flow:

```typescript
// typeof guard
function process(val: string | number) {
  if (typeof val === 'string') {
    val.toUpperCase(); // val: string here
  } else {
    val.toFixed(2);    // val: number here
  }
}

// instanceof guard
function handleError(err: Error | AppError) {
  if (err instanceof AppError) {
    console.error(err.code); // AppError properties available
  }
}

// Custom type guard (type predicate)
interface Cat { meow(): void; }
interface Dog { bark(): void; }

function isCat(animal: Cat | Dog): animal is Cat {
  return 'meow' in animal;
}

// Assertion function
function assertDefined<T>(val: T | null | undefined): asserts val is T {
  if (val == null) throw new Error('Expected defined value');
}

// Exhaustive check with never
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}
```

---

## `satisfies` Operator (TypeScript 4.9+)

Validate that a value matches a type without widening it:

```typescript
const palette = {
  red:   [255, 0, 0],
  green: '#00ff00',
  blue:  [0, 0, 255],
} satisfies Record<string, string | number[]>;

// Without satisfies — type is Record<string, string | number[]>
// With satisfies — TypeScript remembers the exact structure:
palette.red.map(v => v);     // ✅ knows it's number[]
palette.green.toUpperCase(); // ✅ knows it's string
```

---

## Declaration Files & Module Augmentation

```typescript
// global.d.ts — add properties to global scope
declare global {
  interface Window {
    analytics: AnalyticsInstance;
  }
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      JWT_SECRET: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

// Augment a third-party module
declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
    requestId: string;
  }
}
```

---

## tsconfig.json — Key Options

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,              // enables all strict checks
    "strictNullChecks": true,    // null/undefined are not assignable to other types
    "noUncheckedIndexedAccess": true, // arr[i] is T | undefined
    "exactOptionalPropertyTypes": true, // { a?: string } doesn't allow a: undefined
    "noImplicitReturns": true,   // all code paths must return
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,     // required for Vite/esbuild
    "paths": {
      "@/*": ["./src/*"]         // path aliases
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Key strict flags: `strict` enables `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`.

---

## Common Patterns

### Builder Pattern with Types

```typescript
class QueryBuilder<T extends Record<string, unknown>> {
  private filters: Partial<T> = {};
  private _limit = 100;

  where<K extends keyof T>(key: K, value: T[K]): this {
    this.filters[key] = value;
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  build(): { filters: Partial<T>; limit: number } {
    return { filters: this.filters, limit: this._limit };
  }
}

const query = new QueryBuilder<User>()
  .where('name', 'Alice')   // ✅ TypeScript validates value matches key's type
  .where('age', 'old')      // ❌ Type 'string' is not assignable to type 'number'
  .limit(10)
  .build();
```

### Environment Variable Safety

```typescript
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env variable: ${key}`);
  return value;
}

const config = {
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret:   requireEnv('JWT_SECRET'),
  port:        parseInt(requireEnv('PORT'), 10),
} as const;
```
