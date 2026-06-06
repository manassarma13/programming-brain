---
title: "SQL, Indexing & Query Optimisation"
category: "Databases"
difficulty: "intermediate"
tags: ["SQL", "indexing", "B-tree", "query-plan", "joins", "normalisation", "partitioning", "EXPLAIN"]
order: 1
---

# SQL, Indexing & Query Optimisation

SQL is the lingua franca of data. But writing SQL that works and SQL that scales are very different skills. This article covers relational database internals — how data is stored, how indexes work, and how the query planner turns your SQL into an efficient execution plan.

---

## Relational Model Fundamentals

A relational database stores data in **tables** (relations) with **rows** (tuples) and **columns** (attributes). The **schema** defines column names and types.

### Normalisation

Normalisation reduces data redundancy by splitting tables according to **normal forms**:

| Normal Form | Rule |
|---|---|
| **1NF** | Each column holds atomic (indivisible) values; no repeating groups |
| **2NF** | 1NF + every non-key column depends on the **whole** primary key |
| **3NF** | 2NF + no transitive dependencies (non-key depends only on the key) |
| **BCNF** | 3NF + every determinant is a candidate key |

```sql
-- ❌ Violates 1NF — phone_numbers is multi-valued
CREATE TABLE users (
  id INT,
  name VARCHAR,
  phone_numbers VARCHAR  -- "555-1234, 555-5678"
);

-- ✅ 1NF
CREATE TABLE users (id INT, name VARCHAR, PRIMARY KEY (id));
CREATE TABLE user_phones (user_id INT, phone VARCHAR, PRIMARY KEY (user_id, phone));
```

---

## How Data Is Stored — The Page Model

Most databases (PostgreSQL, MySQL, SQLite) store data in **fixed-size pages** (typically 8KB):

```
Disk:
  Page 0: [row1][row2][row3][row4][free space]
  Page 1: [row5][row6][row7][row8][free space]
  Page 2: [row9][row10]...

A full table scan reads ALL pages sequentially.
An index lookup reads only the relevant page(s).
```

A table with 1 million rows × 200 bytes/row = 200MB = 25,600 pages. A full scan reads all 25,600 pages. An index can narrow it to 1–3 pages.

---

## Indexes — The Core Optimisation

An **index** is a separate data structure that speeds up lookups at the cost of additional storage and slower writes.

### B-Tree Index (Default in PostgreSQL, MySQL InnoDB)

A **B+ tree** stores keys in sorted order across a tree of fixed-size nodes. Every leaf node also stores the actual row location (or row itself in clustered indexes).

```
         [50]
        /     \
    [20,35]   [70,90]
   /   |   \    |    \
[10,15][25,30][40,45][60,65][80,95]  ← leaf nodes (doubly linked!)
```

- **Range queries** are efficient — leaves are linked, so scan from start to end
- **Point lookups** — O(log n) — walk the tree to the leaf
- **Writes** — O(log n) + rebalancing cost

### Creating Indexes

```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index — column order matters!
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
-- Efficient for: WHERE user_id = ? AND created_at > ?
-- Efficient for: WHERE user_id = ?
-- NOT efficient for: WHERE created_at > ?  ← can't skip first column

-- Unique index
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

-- Partial index — index a subset of rows
CREATE INDEX idx_active_users ON users(email) WHERE deleted_at IS NULL;

-- Expression index
CREATE INDEX idx_lower_email ON users(LOWER(email));
-- Enables: WHERE LOWER(email) = 'alice@example.com'
```

### Clustered vs Non-Clustered Index

| Type | Definition | Example |
|---|---|---|
| **Clustered** (primary) | Rows physically ordered by this key. One per table. | InnoDB PK, PostgreSQL CLUSTER |
| **Non-clustered** (secondary) | Separate structure; leaf nodes point to row location | All secondary indexes |

In PostgreSQL, every index is non-clustered (heap table). In MySQL InnoDB, the primary key IS the clustered index — secondary indexes store the PK value as the row pointer.

---

## Query Execution Plan — EXPLAIN

`EXPLAIN` shows how the query planner will execute your query **without running it**. `EXPLAIN ANALYZE` actually runs it and shows real timings.

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 10;
```

```
QUERY PLAN:
  Limit  (cost=1500.00..1500.03 rows=10) (actual time=45.2..45.3 rows=10)
    -> Sort  (cost=1500..1502 rows=800) (actual time=45.2..45.2 rows=10)
         Sort Key: (count(o.id)) DESC
         -> HashAggregate  (cost=1450..1475 rows=800)
              -> Hash Left Join  (cost=120..1400)
                   Hash Cond: (o.user_id = u.id)
                   -> Seq Scan on orders o  (cost=0..800)        ← ⚠️ full scan!
                   -> Bitmap Heap Scan on users u  (cost=5..120)
                        Filter: (created_at > '2024-01-01')
                        -> Bitmap Index Scan on idx_users_created
```

**Red flags in query plans:**
- `Seq Scan` on a large table (missing index)
- `Nested Loop` on large tables (should be `Hash Join`)
- `Sort` that could be eliminated with a proper index
- High `rows` estimates vs actual rows (stale statistics)

---

## JOIN Types

```sql
-- INNER JOIN: only matching rows from both tables
SELECT u.name, o.id FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- LEFT JOIN: all rows from left, matching from right (NULLs for no match)
SELECT u.name, o.id FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- RIGHT JOIN: all rows from right, matching from left
-- FULL OUTER JOIN: all rows from both, NULLs where no match

-- CROSS JOIN: cartesian product (every combination)
-- Use with caution — N×M rows!
```

### JOIN Algorithms (internals)

| Algorithm | When used | Complexity |
|---|---|---|
| **Nested Loop Join** | One small table, one with an index on join key | O(n × log m) |
| **Hash Join** | Large tables, no useful index on join key | O(n + m) |
| **Merge Join** | Both tables pre-sorted on join key | O(n + m) |

---

## Window Functions

Window functions compute values **across related rows** without collapsing them (unlike `GROUP BY`):

```sql
SELECT
  name,
  department,
  salary,
  -- Rank within department (1 = highest salary)
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank,
  -- Running total of salary by hire date
  SUM(salary) OVER (PARTITION BY department ORDER BY hire_date
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
  -- Compare to department average
  salary - AVG(salary) OVER (PARTITION BY department) AS vs_avg,
  -- Lead/lag — access adjacent rows
  LAG(salary, 1) OVER (PARTITION BY department ORDER BY hire_date) AS prev_salary
FROM employees;
```

Common window functions: `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`, `NTILE()`, `LAG()`, `LEAD()`, `FIRST_VALUE()`, `LAST_VALUE()`, `SUM()`, `AVG()`, `COUNT()`.

---

## CTEs and Recursive Queries

```sql
-- CTE (Common Table Expression) — named subquery
WITH active_users AS (
  SELECT id, name FROM users WHERE deleted_at IS NULL
),
user_totals AS (
  SELECT user_id, SUM(amount) AS total FROM orders GROUP BY user_id
)
SELECT u.name, COALESCE(t.total, 0) AS total
FROM active_users u
LEFT JOIN user_totals t ON u.id = t.user_id;

-- Recursive CTE — org chart / tree traversal
WITH RECURSIVE org_tree AS (
  -- Base case: top-level managers
  SELECT id, name, manager_id, 0 AS depth
  FROM employees WHERE manager_id IS NULL

  UNION ALL

  -- Recursive case: employees under each manager
  SELECT e.id, e.name, e.manager_id, ot.depth + 1
  FROM employees e
  INNER JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT * FROM org_tree ORDER BY depth, name;
```

---

## Indexing Strategies

### The Index Selectivity Rule

An index is only useful if it's **selective** — it narrows down the result set significantly. A boolean column (`is_active`) with 90% TRUE values has **low selectivity** — an index on it is often ignored.

```sql
-- Low selectivity — index rarely used
CREATE INDEX idx_status ON orders(status);  -- if 80% are 'completed'

-- High selectivity — excellent candidate for index
CREATE INDEX idx_email ON users(email);     -- nearly unique
```

### Covering Index

A **covering index** includes all columns needed by a query — the database never touches the main table:

```sql
-- Query
SELECT name, email FROM users WHERE department = 'Engineering' ORDER BY name;

-- Covering index — includes all selected + filtered columns
CREATE INDEX idx_users_covering ON users(department, name, email);
-- Index contains department (for WHERE), name (for ORDER BY + SELECT), email (for SELECT)
-- → Index-only scan — never reads the table!
```

### Common Anti-Patterns

```sql
-- ❌ Function on indexed column — index unused
WHERE YEAR(created_at) = 2024
-- ✅ Use range instead
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'

-- ❌ Leading wildcard — can't use B-tree
WHERE name LIKE '%alice%'
-- ✅ Full-text search instead
WHERE to_tsvector(name) @@ to_tsquery('alice')

-- ❌ Implicit type cast — index skipped
WHERE user_id = '123'  -- user_id is INT
-- ✅ Matching types
WHERE user_id = 123

-- ❌ OR across columns — often misses indexes
WHERE first_name = 'Alice' OR last_name = 'Alice'
-- ✅ UNION instead
SELECT * FROM users WHERE first_name = 'Alice'
UNION
SELECT * FROM users WHERE last_name = 'Alice'
```

---

## Partitioning

Split a large table into smaller physical pieces while maintaining a single logical table:

```sql
-- Range partitioning by year (PostgreSQL)
CREATE TABLE orders (
  id BIGSERIAL,
  user_id INT,
  amount NUMERIC,
  created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2023 PARTITION OF orders
  FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE orders_2024 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Query automatically routes to the right partition
SELECT * FROM orders WHERE created_at > '2024-06-01';
-- Only scans orders_2024!
```

Partition types: **range**, **list**, **hash**. Used when a single table exceeds hundreds of millions of rows.
