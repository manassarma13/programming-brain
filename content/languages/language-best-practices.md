---
title: "Language Best Practices"
category: "Languages & Runtimes"
difficulty: "intermediate"
tags: ["best-practices", "Go", "Python", "JavaScript", "TypeScript", "Ruby", "Rust", "Elixir", "idioms", "patterns"]
order: 3
---

# Language Best Practices

Each language has idioms — patterns that feel natural, are well-optimised, and signal to other engineers that you truly understand the language. Writing code that **looks like Go** or **looks like Python** is just as important as making it work correctly. This article covers the key best practices for the most widely used languages.

---

## JavaScript / TypeScript

### Use TypeScript — Always

TypeScript catches entire classes of bugs at compile time and dramatically improves tooling (autocomplete, refactoring, jump-to-definition). In 2025, there is essentially no reason to write large JavaScript projects without TypeScript.

```typescript
// ❌ JavaScript — no protection
function getUser(id) {
  return fetch(`/api/users/${id}`).then(r => r.json());
}

// ✅ TypeScript — self-documenting, safe
interface User {
  id: number;
  name: string;
  email: string;
}

async function getUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<User>;
}
```

### Prefer Explicit Over Magic

```typescript
// ❌ Implicit — what does this return?
const result = data.reduce((acc, x) => ({ ...acc, [x.id]: x }), {});

// ✅ Explicit — intent is clear
const usersById = new Map<number, User>(
  users.map(user => [user.id, user])
);
```

### Error Handling — Never Swallow Errors

```typescript
// ❌ Swallowed error — bugs disappear silently
try {
  await riskyOperation();
} catch (_) {} // ← worst pattern in JS

// ✅ Handle or re-throw with context
try {
  await riskyOperation();
} catch (err) {
  logger.error('riskyOperation failed', { err, userId });
  throw new AppError('Operation failed', { cause: err });
}
```

### Async Best Practices

```typescript
// ❌ Sequential when parallel is possible
const user    = await fetchUser(id);
const posts   = await fetchPosts(id);
const friends = await fetchFriends(id);

// ✅ Parallel — 3× faster
const [user, posts, friends] = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
  fetchFriends(id),
]);
```

---

## Python

### Use Type Hints (Python 3.5+)

```python
# ❌ Untyped — mystery function
def process(data, config):
    ...

# ✅ Typed — clear contract
from typing import TypedDict

class Config(TypedDict):
    batch_size: int
    verbose: bool

def process(data: list[dict], config: Config) -> list[dict]:
    ...
```

Use `mypy` or `pyright` for static type checking.

### Prefer List/Dict/Set Comprehensions

```python
# ❌ Verbose loop
result = []
for x in data:
    if x > 0:
        result.append(x * 2)

# ✅ Comprehension — idiomatic Python
result = [x * 2 for x in data if x > 0]

# Generator for large datasets (lazy evaluation)
result = (x * 2 for x in data if x > 0)
```

### Context Managers for Resource Management

```python
# ❌ Manual cleanup — error-prone
f = open('data.csv')
try:
    data = f.read()
finally:
    f.close()

# ✅ Context manager — guaranteed cleanup
with open('data.csv') as f:
    data = f.read()

# Custom context manager
from contextlib import contextmanager

@contextmanager
def transaction(db):
    t = db.begin()
    try:
        yield t
        t.commit()
    except Exception:
        t.rollback()
        raise
```

### Dataclasses and Named Tuples

```python
from dataclasses import dataclass, field

# ❌ Bare dict — no structure, no autocomplete
user = {'name': 'Alice', 'age': 30, 'roles': []}

# ✅ Dataclass — typed, equality, repr for free
@dataclass
class User:
    name: str
    age: int
    roles: list[str] = field(default_factory=list)
    active: bool = True

    def is_admin(self) -> bool:
        return 'admin' in self.roles

user = User(name='Alice', age=30)
```

### Avoid `import *`

```python
# ❌ Namespace pollution
from os.path import *

# ✅ Explicit imports
from os.path import join, exists, dirname
```

### Use `pathlib` over `os.path`

```python
# ❌ os.path — awkward
import os
path = os.path.join(os.path.dirname(__file__), 'data', 'file.csv')

# ✅ pathlib — object-oriented, chainable
from pathlib import Path
path = Path(__file__).parent / 'data' / 'file.csv'
text = path.read_text()
```

---

## Go

### Error Handling — Return, Don't Panic

```go
// ❌ Don't panic in library code — let callers decide
func parseConfig(path string) Config {
    data, _ := os.ReadFile(path) // ignoring error
    var cfg Config
    json.Unmarshal(data, &cfg)   // ignoring error
    return cfg
}

// ✅ Explicit error returns — Go's idiom
func parseConfig(path string) (Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return Config{}, fmt.Errorf("reading config %q: %w", path, err)
    }
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return Config{}, fmt.Errorf("parsing config: %w", err)
    }
    return cfg, nil
}
```

### Wrap Errors with Context

```go
// ❌ Loses context
return err

// ✅ Wrap with %w to preserve error chain
return fmt.Errorf("fetchUser(%d): %w", id, err)

// Unwrap errors
if errors.Is(err, sql.ErrNoRows) { ... }
var myErr *MyError
if errors.As(err, &myErr) { ... }
```

### Interfaces — Accept Interfaces, Return Structs

```go
// Accept the narrowest interface needed
func Render(w io.Writer, tmpl *template.Template, data any) error {
    return tmpl.Execute(w, data)
}
// Can pass os.Stdout, http.ResponseWriter, bytes.Buffer — all io.Writers

// Return concrete types from constructors
func NewCache(size int) *LRUCache { // not Cache interface
    return &LRUCache{size: size, store: make(map[string]any)}
}
```

### Goroutine Lifecycle — Always Have an Exit Condition

```go
// ❌ Goroutine leak — runs forever
go func() {
    for {
        doWork()
    }
}()

// ✅ Cancellable via context
func worker(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return // clean exit
        default:
            doWork()
        }
    }
}

ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
go worker(ctx)
```

### Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name string
        a, b int
        want int
    }{
        {"positive", 2, 3, 5},
        {"negative", -1, -2, -3},
        {"zero", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.want {
                t.Errorf("Add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

---

## Rust

### Leverage the Type System for Correctness

```rust
// ❌ Stringly-typed — errors at runtime
fn set_status(status: &str) { ... }
set_status("actve"); // typo caught at... runtime

// ✅ Enum — errors at compile time
#[derive(Debug, Clone, PartialEq)]
enum Status { Active, Inactive, Suspended }

fn set_status(status: Status) { ... }
// set_status(Status::Actve) // compile error — variant doesn't exist
```

### Use `Result<T, E>` and the `?` Operator

```rust
use std::fs;
use std::io;

fn read_username() -> Result<String, io::Error> {
    let content = fs::read_to_string("username.txt")?; // ? propagates error
    Ok(content.trim().to_string())
}

// Chain with map_err for context
fn load_config(path: &str) -> Result<Config, AppError> {
    let data = fs::read_to_string(path)
        .map_err(|e| AppError::Io { path: path.to_string(), source: e })?;
    serde_json::from_str(&data)
        .map_err(|e| AppError::Parse(e))
}
```

### Prefer `Clone` Consciously

```rust
// Cloning is sometimes necessary — but be intentional
let expensive = load_large_data(); // say 10MB

// ❌ Clones 10MB unnecessarily
process(expensive.clone());
format_output(expensive.clone());

// ✅ Pass references where possible
process(&expensive);
format_output(&expensive);
```

### Use Iterators Over Loops

```rust
// ❌ Imperative loop
let mut sum = 0;
for i in 0..data.len() {
    if data[i] > 0 {
        sum += data[i] * 2;
    }
}

// ✅ Iterator chains — zero-cost abstractions (compiled to same loop)
let sum: i32 = data.iter()
    .filter(|&&x| x > 0)
    .map(|&x| x * 2)
    .sum();
```

---

## Ruby

### Use Keyword Arguments for Clarity

```ruby
# ❌ Positional — unclear call site
def create_user(name, email, admin, active)
create_user("Alice", "alice@example.com", false, true) # what's false, true?

# ✅ Keyword arguments
def create_user(name:, email:, admin: false, active: true)
create_user(name: "Alice", email: "alice@example.com", admin: false)
```

### Prefer `map`/`select`/`reduce` Over `each`

```ruby
# ❌ Imperative with each
result = []
users.each { |u| result << u.name if u.active? }

# ✅ Functional
names = users.select(&:active?).map(&:name)
```

### Use `frozen_string_literal`

```ruby
# frozen_string_literal: true
# Add to top of every file — strings become immutable, saves allocations
# Ruby 3+ encourages this
```

### Service Objects for Complex Business Logic

```ruby
# ❌ Fat model with 20 methods
class User < ApplicationRecord
  def self.register(params) ... end
  def send_welcome_email ... end
  def create_trial_subscription ... end
end

# ✅ Service object — single responsibility
class Users::RegistrationService
  def initialize(params)
    @params = params
  end

  def call
    ActiveRecord::Base.transaction do
      user = create_user
      send_welcome_email(user)
      create_trial(user)
      user
    end
  end

  private

  def create_user = User.create!(@params)
  def send_welcome_email(user) = UserMailer.welcome(user).deliver_later
  def create_trial(user) = Subscription.create_trial(user)
end
```

---

## Elixir

### Use Pattern Matching Everywhere

```elixir
# ❌ Conditional branching
def process(result) do
  if result == :ok do
    handle_success()
  else
    handle_error()
  end
end

# ✅ Pattern matching in function heads
def process({:ok, data}),    do: handle_success(data)
def process({:error, reason}), do: handle_error(reason)
```

### Prefer `with` for Sequential Operations

```elixir
# ❌ Nested case statements
def create_order(params) do
  case validate(params) do
    {:ok, valid_params} ->
      case create_in_db(valid_params) do
        {:ok, order} -> send_confirmation(order)
        {:error, _} = err -> err
      end
    {:error, _} = err -> err
  end
end

# ✅ with — flat and clear
def create_order(params) do
  with {:ok, valid} <- validate(params),
       {:ok, order} <- create_in_db(valid),
       {:ok, _}     <- send_confirmation(order) do
    {:ok, order}
  end
end
```

### Use Contexts to Organise Business Logic

```elixir
# ❌ Calling Repo directly from controllers
def create(conn, params) do
  Repo.insert(User.changeset(%User{}, params))
end

# ✅ Use context module as the public API
def create(conn, params) do
  case Accounts.create_user(params) do
    {:ok, user}    -> json(conn, user)
    {:error, changeset} -> conn |> put_status(422) |> json(errors(changeset))
  end
end
```

---

## Universal Best Practices

| Practice | All Languages |
|---|---|
| **Name things clearly** | `user_activation_token` not `t` or `tok` |
| **Functions do one thing** | Max 20–30 lines as a rule of thumb |
| **Write tests first (or immediately after)** | Untested code is broken code |
| **No magic numbers** | `const MAX_RETRIES = 3` not `if retries > 3` |
| **Fail loudly** | Crash with a clear error > silently produce wrong results |
| **Don't repeat yourself (DRY)** | But don't over-abstract prematurely |
| **Use a linter/formatter** | `eslint`/`prettier`, `golangci-lint`, `clippy`, `rubocop`, `mix format` |
| **Document public APIs** | Code tells you HOW; docs tell you WHY |
| **Keep dependencies minimal** | Each dependency is a security/compatibility risk |
| **Review diffs before committing** | Catch accidental debug code, commented-out code, secrets |
