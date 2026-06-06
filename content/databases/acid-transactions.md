---
title: "ACID Transactions & Database Internals"
category: "Databases"
difficulty: "intermediate"
tags: ["ACID", "transactions", "isolation", "MVCC", "WAL", "locking", "deadlocks", "consistency"]
order: 2
---

# ACID Transactions & Database Internals

Transactions are what make databases trustworthy. Without them, concurrent writes cause corruption, crashes leave data half-written, and distributed systems become impossible to reason about.

---

## What Is a Transaction?

A transaction is a sequence of operations treated as a **single unit of work** — either all succeed or all fail. No partial states.

```sql
BEGIN;

UPDATE accounts SET balance = balance - 500 WHERE id = 1;  -- debit Alice
UPDATE accounts SET balance = balance + 500 WHERE id = 2;  -- credit Bob

COMMIT;  -- both updates persisted atomically

-- If anything fails before COMMIT:
ROLLBACK; -- both updates are undone
```

---

## ACID Properties

### Atomicity

All operations in a transaction succeed, or **none** do. The database is never left in a partial state.

**How it's implemented:** The database writes a **Write-Ahead Log (WAL)** — every change is recorded in the log before being applied to data pages. If the system crashes, the WAL is replayed or rolled back on restart.

### Consistency

A transaction brings the database from one **valid state** to another valid state. Constraints (foreign keys, unique constraints, check constraints) are enforced.

```sql
-- Constraint violation → entire transaction rolls back
BEGIN;
INSERT INTO orders (user_id, product_id) VALUES (999, 1);
-- ❌ FK constraint violation: user 999 doesn't exist → ROLLBACK
```

### Isolation

Concurrent transactions don't interfere with each other. Each transaction sees a **consistent snapshot** of the data.

### Durability

Once committed, data **persists** — even if the server crashes immediately after. Achieved via WAL + `fsync()` to flush data to disk.

---

## Isolation Levels & Anomalies

Higher isolation = fewer anomalies but more contention.

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|---|---|---|---|
| Read Uncommitted | ✅ possible | ✅ possible | ✅ possible |
| **Read Committed** (default PG) | ❌ prevented | ✅ possible | ✅ possible |
| **Repeatable Read** | ❌ | ❌ | ✅ possible |
| **Serializable** | ❌ | ❌ | ❌ |

### Anomaly Definitions

**Dirty Read** — Transaction A reads data written by uncommitted Transaction B. If B rolls back, A has read phantom data.

**Non-Repeatable Read** — Transaction A reads a row, Transaction B modifies and commits it, A reads the same row and gets different data.

**Phantom Read** — Transaction A reads a set of rows matching a condition. Transaction B inserts rows matching that condition. A re-reads and gets more rows.

**Write Skew** — Two transactions read overlapping data and each updates disjoint parts based on what they read — leading to a globally inconsistent state (not prevented until Serializable).

```sql
-- Set isolation level for a transaction
BEGIN ISOLATION LEVEL REPEATABLE READ;
-- ... your queries
COMMIT;

-- Or set session-level default
SET default_transaction_isolation = 'serializable';
```

---

## MVCC — Multi-Version Concurrency Control

PostgreSQL (and MySQL InnoDB) use **MVCC** to implement isolation without locking reads. Instead of locking rows for reading, the database keeps **multiple versions** of each row.

```
Row "Alice", balance=1000
  Version 1: xmin=100, xmax=NULL  ← created by transaction 100
  
Transaction 101: UPDATE balance=500
  Version 1: xmin=100, xmax=101   ← marked deleted by 101
  Version 2: xmin=101, xmax=NULL  ← new version

Transaction 102 (started before 101 committed):
  Sees Version 1 (xmax=101, but 101 not yet committed → still valid for 102)

Transaction 103 (started after 101 committed):
  Sees Version 2 (Version 1's xmax=101 is committed → use Version 2)
```

- **Reads never block writes**
- **Writes never block reads**
- Old versions accumulate → **VACUUM** cleans them up (PostgreSQL's autovacuum)

---

## Locking

MVCC handles read-write concurrency, but write-write conflicts still require locks.

### Row-Level Locks

```sql
-- SELECT ... FOR UPDATE — lock selected rows (prevents concurrent modification)
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;  -- acquires row lock
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;  -- releases lock

-- SELECT ... FOR SHARE — shared lock (multiple readers, no writers)
SELECT * FROM products WHERE id = 1 FOR SHARE;

-- Skip locked rows (non-blocking queue pattern)
SELECT * FROM jobs WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

### Table-Level Locks

```sql
-- Explicit table lock (used for schema changes, bulk operations)
LOCK TABLE users IN ACCESS EXCLUSIVE MODE;
-- Blocks ALL other operations on the table
```

### Advisory Locks — Application-Level Locking

```sql
-- Application-defined locks — useful for distributed mutual exclusion
SELECT pg_try_advisory_lock(42);   -- non-blocking, returns boolean
SELECT pg_advisory_lock(42);       -- blocking
SELECT pg_advisory_unlock(42);

-- Use a hash of a resource identifier
SELECT pg_advisory_lock(hashtext('user:123:profile'));
```

---

## Deadlocks

A deadlock occurs when two transactions each hold a lock the other needs:

```
Transaction A: locks row 1, waits for row 2
Transaction B: locks row 2, waits for row 1
→ Circular wait → deadlock
```

**Database resolution:** Detect the cycle, pick a **victim** transaction to abort, the other proceeds.

**Prevention:**
1. Always acquire locks in the **same order** across transactions
2. Use `NOWAIT` or `SKIP LOCKED` to fail fast instead of waiting
3. Keep transactions short — less time holding locks

```sql
-- Fail immediately if can't acquire lock (instead of waiting)
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
-- → ERROR: could not obtain lock on row in relation "accounts"
```

---

## Write-Ahead Log (WAL)

The WAL is the foundation of durability. All changes are written to the WAL **before** being applied to data pages:

```
1. Transaction commits
2. WAL record written to WAL buffer
3. WAL buffer flushed to disk (fsync) → transaction is durable
4. Data pages updated lazily (background writer)

On crash:
1. Database reads WAL from last checkpoint
2. Replays committed transactions (redo)
3. Rolls back incomplete transactions (undo)
```

WAL also powers **streaming replication** — replicas receive the WAL stream and apply it continuously.

---

## Savepoints — Partial Rollback

```sql
BEGIN;

INSERT INTO orders (user_id) VALUES (1);

SAVEPOINT before_payment;

INSERT INTO payments (order_id, amount) VALUES (1, 100);
-- ❌ payment fails

ROLLBACK TO SAVEPOINT before_payment;
-- Payment rolled back, order still exists in this transaction

-- Try alternative payment method
INSERT INTO payments (order_id, amount, method) VALUES (1, 100, 'credit');

COMMIT;  -- order + credit payment committed
```

---

## Optimistic vs Pessimistic Concurrency

| Strategy | Mechanism | Best for |
|---|---|---|
| **Pessimistic** | Lock before read (`FOR UPDATE`) | High contention, frequent conflicts |
| **Optimistic** | Check version on write, retry on conflict | Low contention, read-heavy |

```sql
-- Optimistic concurrency with version column
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 42 AND version = 7;  -- fails if another transaction modified it

-- Check if update succeeded
-- 0 rows affected → conflict → retry
```

```typescript
// Application-level optimistic lock
async function decrementStock(productId: number, expectedVersion: number) {
  const { rowCount } = await db.query(
    `UPDATE products SET stock = stock - 1, version = version + 1
     WHERE id = $1 AND version = $2 AND stock > 0`,
    [productId, expectedVersion]
  );
  if (rowCount === 0) throw new ConflictError('Product was modified, please retry');
}
```
