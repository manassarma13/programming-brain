---
title: "Elixir & Phoenix Framework"
category: "Backend Engineering"
difficulty: "intermediate"
tags: ["Elixir", "Phoenix", "BEAM", "OTP", "GenServer", "supervision", "LiveView", "channels", "functional"]
order: 2
---

# Elixir & Phoenix Framework

Elixir is a **functional, concurrent, fault-tolerant** language built on the Erlang VM (BEAM). It was designed by José Valim in 2012 to bring modern developer ergonomics to one of the most battle-tested runtime environments in the world. Phoenix is its flagship web framework — often compared to Rails for developer productivity, but with fundamentally different guarantees.

---

## Why Elixir Exists

Erlang was built by Ericsson in the 1980s for telecom switches — systems that cannot go down. It pioneered:
- **Actor model concurrency** — lightweight processes (not OS threads) communicating via messages
- **Let it crash** philosophy — instead of defensive programming, design supervisors that restart failed processes
- **Hot code reloading** — deploy new code without stopping the system
- **9 nines reliability** — Erlang systems have achieved 99.9999999% uptime in production

Elixir takes this runtime and adds: modern syntax (inspired by Ruby), metaprogramming with macros, a rich standard library, and an excellent toolchain (`mix`, `hex`).

---

## Core Language Concepts

### Immutability & Pattern Matching

```elixir
# Variables are immutable — rebinding creates a new binding
x = 1
x = 2  # this re-binds x, doesn't mutate memory

# Pattern matching is the core of control flow
{:ok, user} = fetch_user(id)     # destructures tuple
{:error, reason} = fetch_user(-1) # matches error tuple

# Match operator = asserts structure
[head | tail] = [1, 2, 3]
# head = 1, tail = [2, 3]

%{name: name, age: age} = user
# name = "Alice", age = 30
```

### Pipe Operator `|>`

```elixir
# Without pipes — nested and hard to read
result = Enum.join(Enum.map(Enum.filter(users, &(&1.active)), &(&1.name)), ", ")

# With pipes — reads left to right like a pipeline
result =
  users
  |> Enum.filter(& &1.active)
  |> Enum.map(& &1.name)
  |> Enum.join(", ")
```

### Processes & Message Passing

```elixir
# Spawn a lightweight process
pid = spawn(fn ->
  receive do
    {:greet, name} -> IO.puts("Hello, #{name}!")
  end
end)

# Send a message
send(pid, {:greet, "Alice"})  # "Hello, Alice!"

# Processes are isolated — no shared memory
# A crash in one process doesn't affect others
```

---

## OTP — The Concurrency Framework

**OTP** (Open Telecom Platform) is a set of libraries and design principles for building concurrent, fault-tolerant systems. It ships with Elixir as standard.

### GenServer — The Workhorse

A `GenServer` is a generic server process that handles synchronous calls (`call`) and asynchronous casts (`cast`):

```elixir
defmodule MyApp.Cache do
  use GenServer

  # Client API
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, %{}, opts)
  end

  def get(pid, key) do
    GenServer.call(pid, {:get, key})
  end

  def put(pid, key, value) do
    GenServer.cast(pid, {:put, key, value})
  end

  def delete(pid, key) do
    GenServer.cast(pid, {:delete, key})
  end

  # Server callbacks
  @impl true
  def init(state), do: {:ok, state}

  @impl true
  def handle_call({:get, key}, _from, state) do
    {:reply, Map.get(state, key), state}
  end

  @impl true
  def handle_cast({:put, key, value}, state) do
    {:noreply, Map.put(state, key, value)}
  end

  @impl true
  def handle_cast({:delete, key}, state) do
    {:noreply, Map.delete(state, key)}
  end

  # Handle timeouts, messages, etc.
  @impl true
  def handle_info(:cleanup, state) do
    {:noreply, Map.new(state, fn {k, v} -> {k, v} end)}
  end
end

# Usage
{:ok, cache} = MyApp.Cache.start_link()
MyApp.Cache.put(cache, :user_1, %{name: "Alice"})
MyApp.Cache.get(cache, :user_1) # %{name: "Alice"}
```

### Supervision Trees — Fault Tolerance

Supervisors watch over child processes and restart them according to a strategy when they crash:

```elixir
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    children = [
      # Start the Repo (DB connection pool)
      MyApp.Repo,
      # Start the Cache GenServer (named, so we can find it)
      {MyApp.Cache, name: MyApp.Cache},
      # Start the web endpoint
      MyAppWeb.Endpoint,
      # Start a task supervisor for background jobs
      {Task.Supervisor, name: MyApp.TaskSupervisor},
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

| Strategy | Behaviour on crash |
|---|---|
| `:one_for_one` | Only restart the crashed child |
| `:one_for_all` | Restart all children |
| `:rest_for_one` | Restart crashed child + all children started after it |

If a process crashes, its supervisor restarts it. If it crashes too frequently (exceeding `max_restarts` in `max_seconds`), the supervisor itself crashes — and its supervisor handles that. This creates a clean, predictable failure cascade.

### Registry & Named Processes

```elixir
# Start a registry
{Registry, keys: :unique, name: MyApp.Registry}

# Register a process under a key
Registry.register(MyApp.Registry, {:session, user_id}, nil)

# Look up a process anywhere in the system
[{pid, _}] = Registry.lookup(MyApp.Registry, {:session, user_id})
send(pid, :logout)
```

---

## Phoenix Framework

Phoenix is to Elixir what Rails is to Ruby — a full-featured web framework with conventions for routing, controllers, views, and database access (Ecto).

### Project Structure

```
my_app/
├── lib/
│   ├── my_app/              # Business logic (contexts)
│   │   ├── accounts.ex      # Context module
│   │   ├── accounts/
│   │   │   ├── user.ex      # Ecto schema
│   │   │   └── token.ex
│   │   └── repo.ex
│   └── my_app_web/          # Web layer
│       ├── router.ex
│       ├── controllers/
│       ├── live/            # LiveView modules
│       ├── components/      # HEEx components
│       └── endpoint.ex
├── priv/
│   └── repo/migrations/
└── test/
```

### Router

```elixir
defmodule MyAppWeb.Router do
  use MyAppWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug MyAppWeb.Auth.Pipeline  # JWT auth
  end

  scope "/", MyAppWeb do
    pipe_through :browser

    get "/", PageController, :index
    resources "/posts", PostController

    # LiveView routes
    live "/dashboard", DashboardLive
    live "/users/:id", UserLive.Show
  end

  scope "/api", MyAppWeb.Api do
    pipe_through :api

    resources "/users", UserController, except: [:new, :edit]
    post "/sessions", SessionController, :create
  end
end
```

### Ecto — Database Layer

Ecto is not an ORM — it's a database toolkit. It's explicit and functional:

```elixir
defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :name,         :string
    field :email,        :string
    field :password_hash, :string
    field :password,     :string, virtual: true  # not persisted
    field :confirmed_at, :utc_datetime

    has_many :posts, MyApp.Blog.Post

    timestamps()
  end

  @doc "Changeset for user registration"
  def registration_changeset(user, attrs) do
    user
    |> cast(attrs, [:name, :email, :password])
    |> validate_required([:name, :email, :password])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/)
    |> validate_length(:password, min: 8, max: 72)
    |> unique_constraint(:email)
    |> put_password_hash()
  end

  defp put_password_hash(%Ecto.Changeset{valid?: true, changes: %{password: password}} = changeset) do
    change(changeset, password_hash: Bcrypt.hash_pwd_salt(password))
  end
  defp put_password_hash(changeset), do: changeset
end

# Context module — the public API
defmodule MyApp.Accounts do
  import Ecto.Query

  def get_user!(id), do: Repo.get!(User, id)

  def get_user_by_email(email) do
    Repo.get_by(User, email: email)
  end

  def create_user(attrs) do
    %User{}
    |> User.registration_changeset(attrs)
    |> Repo.insert()
  end

  # Composable queries
  def list_active_users(opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)

    User
    |> where([u], not is_nil(u.confirmed_at))
    |> order_by([u], desc: u.inserted_at)
    |> limit(^limit)
    |> Repo.all()
  end
end
```

### Phoenix Channels — WebSockets

```elixir
defmodule MyAppWeb.RoomChannel do
  use Phoenix.Channel

  def join("room:" <> room_id, _params, socket) do
    if authorised?(socket, room_id) do
      {:ok, assign(socket, :room_id, room_id)}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  def handle_in("new_message", %{"body" => body}, socket) do
    message = %{body: body, user: socket.assigns.current_user}

    # Broadcast to all subscribers in this room
    broadcast!(socket, "new_message", message)
    {:noreply, socket}
  end

  def handle_in("typing", _params, socket) do
    broadcast_from!(socket, "user_typing", %{user: socket.assigns.current_user})
    {:noreply, socket}
  end
end
```

---

## Elixir Best Practices

| Practice | Rationale |
|---|---|
| Use contexts to organise business logic | Prevents a giant `Repo` call scattered everywhere |
| Prefer `case`/`with` over `if` | Pattern matching is more expressive and exhaustive |
| Use `Ecto.Multi` for multi-step DB operations | Atomic transactions with clear rollback |
| Tag results with `{:ok, _}` / `{:error, _}` | Explicit error handling throughout the call chain |
| Use `@spec` typespecs | Enables Dialyzer static analysis |
| Write small, focused GenServers | Single responsibility; easier to test and supervise |
| Use ETS for read-heavy in-memory data | Concurrent reads without GenServer bottleneck |

```elixir
# with — chain operations, stop at first error
with {:ok, user}  <- Accounts.get_user(id),
     {:ok, token} <- Tokens.generate(user),
     {:ok, _}     <- Mailer.send_welcome(user, token) do
  {:ok, user}
else
  {:error, :not_found} -> {:error, "User not found"}
  {:error, reason}     -> {:error, reason}
end
```
