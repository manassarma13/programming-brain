---
title: "Phoenix LiveView vs Rails Hotwire"
category: "Backend Engineering"
difficulty: "intermediate"
tags: ["LiveView", "Hotwire", "Turbo", "Stimulus", "Phoenix", "Rails", "real-time", "server-rendered", "SPA-alternative"]
order: 3
---

# Phoenix LiveView vs Rails Hotwire

Both Phoenix LiveView and Rails Hotwire answer the same question: *"How do I build rich, interactive UIs without writing a full React/Vue SPA?"* They arrived at similar destinations via different philosophies. Understanding both gives you a powerful toolkit for choosing the right backend-driven interactivity approach.

---

## The Problem They Solve

Traditional server-rendered apps require a full page reload on every interaction. SPAs (React, Vue, Angular) solve this but add enormous complexity: client-side routing, state management, API versioning, token auth, hydration bugs, and a huge JS bundle.

Both LiveView and Hotwire offer a **third path**: rich interactivity driven by the **server**, with minimal JavaScript.

---

## Phoenix LiveView

**LiveView** is a library for the [Phoenix Framework](https://phoenixframework.org/) (Elixir). It renders HTML on the server and keeps a **persistent WebSocket connection** open. When state changes, the server computes a **diff** of the HTML and sends only the changed parts to the client.

### Architecture

```
Browser ←─── WebSocket ───→ LiveView Process (Elixir)
  │                               │
  │ User event (click/input)      │
  │──────────────────────────────>│
  │                               │ handle_event/3
  │                               │ Update socket.assigns
  │                               │ Rerender template
  │                               │ Compute HTML diff
  │<──────────────────────────────│
  │ Apply diff (morphdom)         │
```

Each LiveView is an **Erlang process** — isolated, fault-tolerant, with its own state. Thanks to BEAM, you can have **millions** of concurrent LiveView processes.

### A Complete LiveView Example

```elixir
# lib/my_app_web/live/counter_live.ex
defmodule MyAppWeb.CounterLive do
  use MyAppWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, assign(socket, count: 0, step: 1)}
  end

  def handle_event("increment", _params, socket) do
    {:noreply, update(socket, :count, &(&1 + socket.assigns.step))}
  end

  def handle_event("decrement", _params, socket) do
    {:noreply, update(socket, :count, &(&1 - socket.assigns.step))}
  end

  def handle_event("set_step", %{"step" => step}, socket) do
    {:noreply, assign(socket, step: String.to_integer(step))}
  end

  def render(assigns) do
    ~H"""
    <div class="counter">
      <h1>Count: <%= @count %></h1>

      <button phx-click="decrement">-</button>
      <button phx-click="increment">+</button>

      <input type="number" value={@step}
             phx-change="set_step" name="step" />
    </div>
    """
  end
end
```

No JavaScript written. The `phx-click` and `phx-change` attributes are handled by the `phoenix_live_view.js` client hook (a small ~45KB library).

### Real-Time Features with PubSub

```elixir
# Subscribe to a Phoenix.PubSub topic
def mount(_params, _session, socket) do
  if connected?(socket) do
    Phoenix.PubSub.subscribe(MyApp.PubSub, "prices:AAPL")
  end
  {:ok, assign(socket, price: fetch_price("AAPL"))}
end

# Handle broadcast from anywhere in the system
def handle_info({:price_update, price}, socket) do
  {:noreply, assign(socket, price: price)}
end
```

Any process in the system can push updates via PubSub — stock tickers, chat messages, order status — and the LiveView automatically re-renders.

### LiveComponents — Stateful Sub-Components

```elixir
defmodule MyAppWeb.SearchComponent do
  use MyAppWeb, :live_component

  def update(%{items: items}, socket) do
    {:ok, assign(socket, items: items, query: "")}
  end

  def handle_event("search", %{"query" => query}, socket) do
    filtered = Enum.filter(socket.assigns.items, &String.contains?(&1.name, query))
    {:noreply, assign(socket, query: query, filtered: filtered)}
  end

  def render(assigns) do
    ~H"""
    <div id={@id}>
      <input phx-target={@myself} phx-change="search" name="query" value={@query} />
      <ul>
        <%= for item <- @filtered do %>
          <li><%= item.name %></li>
        <% end %>
      </ul>
    </div>
    """
  end
end
```

### LiveView Streams — Efficient Lists

For large lists, LiveView Streams update items individually without re-rendering the whole list:

```elixir
def mount(_params, _session, socket) do
  {:ok, stream(socket, :messages, Messages.list())}
end

def handle_info({:new_message, msg}, socket) do
  {:noreply, stream_insert(socket, :messages, msg, at: 0)}
end

# In template:
# <div id="messages" phx-update="stream">
#   <%= for {id, message} <- @streams.messages do %>
#     <div id={id}><%= message.text %></div>
#   <% end %>
# </div>
```

---

## Rails Hotwire

**Hotwire** (HTML Over The Wire) is Basecamp/37signals' approach, built into Rails 7 by default. It's composed of three parts:

| Library | Role |
|---|---|
| **Turbo Drive** | Intercepts link clicks/form submits, fetches HTML, swaps `<body>` without full reload |
| **Turbo Frames** | Scoped page segments that can be updated independently |
| **Turbo Streams** | Server-pushed HTML fragments that append/replace/remove DOM elements |
| **Stimulus** | Lightweight JS framework for attaching behaviour to existing HTML |

### Architecture

Hotwire has **no persistent connection by default** — it uses standard HTTP. Turbo Streams can use WebSockets (via Action Cable) or SSE for real-time.

```
Browser ←─── HTTP request ───→ Rails Controller
                                      │
                              Renders HTML fragment
                              (or Turbo Stream)
                                      │
Browser ←─── HTML/Turbo Stream ───────┘
  │
Turbo applies DOM update (morphdom)
```

### Turbo Drive — Zero-Config Speed

Add `<%= javascript_importmap_tags %>` and Turbo Drive works automatically — all internal links become AJAX navigations that swap the `<body>` without a full reload. You get SPA-like navigation speed with zero JavaScript written.

```erb
<%# Opt out for specific links %>
<a href="/logout" data-turbo="false">Logout</a>

<%# Replace entire page on navigation %>
<a href="/dashboard">Dashboard</a>  <%# Turbo Drive handles this %>
```

### Turbo Frames — Partial Page Updates

```erb
<%# show.html.erb — wrap a section in a frame %>
<turbo-frame id="product-details">
  <h2><%= @product.name %></h2>
  <p><%= @product.description %></p>
  <%= link_to "Edit", edit_product_path(@product) %>
</turbo-frame>

<%# edit.html.erb — Rails responds with a matching frame %>
<turbo-frame id="product-details">
  <%= form_with model: @product do |f| %>
    <%= f.text_field :name %>
    <%= f.submit "Save" %>
  <% end %>
</turbo-frame>
<%# Only the frame content swaps — rest of page unchanged %>
```

### Turbo Streams — Real-Time Updates

```ruby
# Controller or background job
def create
  @message = Message.create!(message_params)

  respond_to do |format|
    format.turbo_stream do
      render turbo_stream: turbo_stream.prepend("messages",
        partial: "messages/message",
        locals: { message: @message }
      )
    end
    format.html { redirect_to messages_path }
  end
end
```

```erb
<%# messages/index.html.erb %>
<turbo-stream-source src="<%= messages_stream_path %>"></turbo-stream-source>

<div id="messages">
  <%= render @messages %>
</div>
```

Turbo Stream actions: `append`, `prepend`, `replace`, `update`, `remove`, `before`, `after`.

### Stimulus — Sprinkling JavaScript

For interactions that don't need the server (dropdowns, tooltips, form validation):

```javascript
// controllers/dropdown_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu"]
  static classes = ["open"]

  toggle() {
    this.menuTarget.classList.toggle(this.openClass)
  }

  // Close when clicking outside
  close({ target }) {
    if (!this.element.contains(target)) {
      this.menuTarget.classList.remove(this.openClass)
    }
  }
}
```

```erb
<div data-controller="dropdown" data-action="click@window->dropdown#close">
  <button data-action="click->dropdown#toggle">Menu ▾</button>
  <ul data-dropdown-target="menu" data-dropdown-open-class="visible"
      class="hidden">
    <li>Profile</li>
    <li>Settings</li>
  </ul>
</div>
```

---

## Side-by-Side Comparison

| Dimension | Phoenix LiveView | Rails Hotwire |
|---|---|---|
| **Language** | Elixir (functional) | Ruby (OO/mixed) |
| **Connection model** | Persistent WebSocket per client | Standard HTTP (WebSocket opt-in) |
| **State location** | Server-side (Elixir process assigns) | Server-side (DB) + URL-driven |
| **Real-time** | First-class via PubSub + BEAM | Via Action Cable (WebSocket) or SSE |
| **Scalability** | Exceptional — BEAM handles millions of processes | Good — but stateless HTTP scales easier than WS |
| **UI granularity** | Diff-patched DOM at component level | Explicit Turbo Stream actions |
| **JS required** | ~45KB `live_view.js` | ~30KB Turbo + Stimulus |
| **Learning curve** | Elixir + functional + OTP concepts | Ruby/Rails convention (easier for Rails devs) |
| **Ecosystem** | Smaller but growing | Massive Rails ecosystem |
| **Fault tolerance** | Exceptional (BEAM supervisors) | Standard Rails reliability |
| **Best for** | Real-time dashboards, complex interactive UIs, distributed systems | CRUD apps, content sites, traditional web apps with sprinkles of interactivity |

---

## When to Choose LiveView

✅ You want **real-time by default** (presence, live updates, collaboration)  
✅ You need **fault-tolerant** server processes (financial, telecom)  
✅ Your team knows or wants to learn **Elixir** (worth the investment)  
✅ Complex interactive UIs that would otherwise need React  
✅ You want one language for frontend interactivity AND backend logic  

> Discord uses Elixir + Phoenix. WhatsApp uses Erlang (BEAM). LiveView is production-proven at scale.

## When to Choose Hotwire

✅ Your team already knows **Ruby on Rails**  
✅ You have a **standard CRUD** web application  
✅ You want to **stay in the Rails ecosystem** with minimal new concepts  
✅ You need **progressive enhancement** — works without JS  
✅ Interactivity is **secondary** to content/forms  
✅ You want **zero-setup real-time** with minimal infrastructure  

> Basecamp, Hey (email service), GitHub (partially), Shopify use Rails with Hotwire-like patterns.

---

## The Common Ground

Both LiveView and Hotwire share a philosophy:

1. **HTML is the source of truth** — not a JSON API + client-side rendering
2. **Server controls state** — no complex client state management
3. **Minimal JavaScript** — enhance, don't replace HTML
4. **Progressive enhancement** — content is accessible even without JS
5. **Simplicity** — one mental model instead of frontend + backend split

They represent a genuine, production-proven alternative to the full-SPA model — and for many applications, the *better* choice.
