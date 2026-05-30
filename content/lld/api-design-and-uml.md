---
title: "API Design & UML Diagrams"
category: "Low-Level Design (LLD)"
difficulty: "intermediate"
tags: ["REST", "API", "UML", "class-diagram", "sequence-diagram", "versioning"]
order: 2
---

# API Design & UML Diagrams

## RESTful API Design

### REST Principles

| Principle | Meaning |
|---|---|
| **Stateless** | Each request contains all info needed; server stores no client state |
| **Resource-based** | URLs represent nouns (resources), not verbs (actions) |
| **Uniform Interface** | Standard HTTP methods, consistent URL patterns |
| **HATEOAS** | Responses include links to related resources |

### URL Design

```
# ✅ Good — resource-oriented nouns, plural
GET    /api/v1/users          — List users
GET    /api/v1/users/123      — Get user 123
POST   /api/v1/users          — Create user
PUT    /api/v1/users/123      — Replace user 123
PATCH  /api/v1/users/123      — Partial update user 123
DELETE /api/v1/users/123      — Delete user 123

# Nested resources
GET    /api/v1/users/123/orders       — User 123's orders
GET    /api/v1/users/123/orders/456   — Specific order

# ❌ Bad — verbs in URLs, inconsistent
GET    /api/getUser?id=123
POST   /api/createNewUser
GET    /api/user/delete/123
```

### HTTP Status Codes

| Code | Meaning | When to Use |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, malformed input |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, version conflict |
| 422 | Unprocessable Entity | Valid syntax but semantic errors |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Server Error | Server bug |
| 503 | Service Unavailable | Server overloaded/maintenance |

### Request/Response Design

```typescript
// POST /api/v1/users
// Request
{
  "name": "Alice Chen",
  "email": "alice@example.com",
  "role": "admin"
}

// Response (201 Created)
{
  "data": {
    "id": "usr_abc123",
    "name": "Alice Chen",
    "email": "alice@example.com",
    "role": "admin",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "links": {
    "self": "/api/v1/users/usr_abc123",
    "orders": "/api/v1/users/usr_abc123/orders"
  }
}

// Error Response (400)
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "name", "message": "Name is required" }
    ]
  }
}
```

### Pagination

```typescript
// Offset-based (simple, common)
GET /api/v1/users?page=2&limit=20

{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Cursor-based (better for large datasets, real-time)
GET /api/v1/users?cursor=eyJpZCI6MTAwfQ&limit=20

{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MTIwfQ",
    "hasMore": true
  }
}
```

### API Versioning Strategies

| Strategy | Example | Pros | Cons |
|---|---|---|---|
| URL path | `/api/v1/users` | Simple, explicit | URL bloat |
| Query param | `/api/users?version=1` | Easy to default | Easy to forget |
| Header | `Accept: application/vnd.api.v1+json` | Clean URLs | Less visible |
| Content negotiation | `Accept: application/json; version=1` | Standards-based | Complex |

**Recommendation:** URL path versioning (`/v1/`) — most explicit and widely understood.

---

## UML Diagrams

### Class Diagram — E-Commerce Domain

```mermaid
classDiagram
    class User {
        -id: string
        -name: string
        -email: string
        +getOrders() Order[]
        +addToCart(product: Product) void
    }

    class Order {
        -id: string
        -status: OrderStatus
        -total: number
        -createdAt: Date
        +calculateTotal() number
        +cancel() void
    }

    class OrderItem {
        -quantity: number
        -unitPrice: number
        +subtotal() number
    }

    class Product {
        -id: string
        -name: string
        -price: number
        -stock: number
        +isAvailable() boolean
        +reduceStock(qty: number) void
    }

    class Payment {
        -id: string
        -amount: number
        -method: PaymentMethod
        -status: PaymentStatus
        +process() boolean
        +refund() boolean
    }

    class Cart {
        -items: CartItem[]
        +addItem(product: Product, qty: number) void
        +removeItem(productId: string) void
        +checkout() Order
    }

    User "1" --> "*" Order : places
    User "1" --> "1" Cart : has
    Order "1" --> "*" OrderItem : contains
    OrderItem "*" --> "1" Product : references
    Order "1" --> "1" Payment : paid by
```

### Sequence Diagram — Checkout Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend
    participant API as API Server
    participant Auth as Auth Service
    participant Inv as Inventory
    participant Pay as Payment Gateway
    participant DB as Database
    participant MQ as Message Queue

    User->>UI: Click "Checkout"
    UI->>API: POST /orders {cartId, paymentMethod}
    API->>Auth: Validate JWT token
    Auth-->>API: User authenticated

    API->>Inv: Check stock for all items
    Inv-->>API: Stock available ✓

    API->>DB: Create order (status: pending)
    DB-->>API: Order created

    API->>Pay: Charge payment
    Pay-->>API: Payment successful ✓

    API->>Inv: Reduce stock
    API->>DB: Update order (status: confirmed)

    API->>MQ: Publish "OrderConfirmed" event
    MQ-->>MQ: Notify email service
    MQ-->>MQ: Notify analytics service

    API-->>UI: 201 Created {orderId, status}
    UI-->>User: "Order confirmed! 🎉"
```

### State Diagram — Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Order created
    Pending --> PaymentProcessing: Payment initiated
    PaymentProcessing --> Confirmed: Payment successful
    PaymentProcessing --> Failed: Payment failed
    Failed --> Pending: Retry payment
    Confirmed --> Shipped: Items dispatched
    Shipped --> Delivered: Customer received
    Delivered --> [*]
    Confirmed --> Cancelled: User cancels
    Pending --> Cancelled: User cancels
    Cancelled --> [*]
    Delivered --> ReturnRequested: Return initiated
    ReturnRequested --> Refunded: Return approved
    Refunded --> [*]
```

## API Design Checklist

- [ ] Resources are nouns, not verbs
- [ ] Consistent naming convention (camelCase or snake_case, never mixed)
- [ ] Proper HTTP status codes
- [ ] Pagination for list endpoints
- [ ] Rate limiting with `429` and `Retry-After` header
- [ ] Versioning strategy decided
- [ ] Error responses are structured and consistent
- [ ] Authentication/authorization on all endpoints
- [ ] Input validation and sanitization
- [ ] CORS configured for web clients
- [ ] Request/response logging for debugging
- [ ] API documentation (OpenAPI/Swagger)
