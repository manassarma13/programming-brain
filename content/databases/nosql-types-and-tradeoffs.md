---
title: "NoSQL — Types, Trade-offs & Use Cases"
category: "Databases"
difficulty: "intermediate"
tags: ["NoSQL", "MongoDB", "Redis", "Cassandra", "DynamoDB", "document", "key-value", "wide-column", "graph", "CAP"]
order: 3
---

# NoSQL — Types, Trade-offs & Use Cases

NoSQL ("Not only SQL") databases break away from the relational model. Each NoSQL type is purpose-built for a specific access pattern. Knowing which to reach for — and when relational is actually better — is a crucial engineering skill.

---

## Why NoSQL?

Relational databases are excellent general-purpose tools, but they struggle with:
- **Massive scale** — sharding a relational DB is complex; many NoSQL databases were designed for horizontal scale from the start
- **Schema flexibility** — evolving schemas require migrations; documents can evolve freely
- **Specific access patterns** — time-series, graph traversal, and caching have better-fit models
- **Very high write throughput** — relational locking mechanisms become bottlenecks

**Not a silver bullet:** NoSQL databases often sacrifice ACID guarantees, complex querying, and joins.

---

## The Four NoSQL Categories

### 1. Key-Value Stores

The simplest model: a giant distributed hash map.

```
Key            → Value
"user:42"      → { name: "Alice", age: 30 }
"session:abc"  → "user:42"
"rate:ip:1.2.3.4" → "47"
```

**Examples:** Redis, DynamoDB (also document), Riak, etcd

**Redis — In-Memory Key-Value + Data Structures:**

```javascript
const redis = createClient({ url: 'redis://localhost:6379' });

// Strings
await redis.set('user:42:name', 'Alice', { EX: 3600 }); // TTL 1h
await redis.get('user:42:name'); // "Alice"

// Counters (atomic!)
await redis.incr('page:home:views');

// Hashes (object-like)
await redis.hSet('user:42', { name: 'Alice', age: '30' });
await redis.hGet('user:42', 'name'); // "Alice"
await redis.hGetAll('user:42'); // { name: 'Alice', age: '30' }

// Lists (queue / stack)
await redis.lPush('jobs:pending', JSON.stringify(job));
await redis.rPop('jobs:pending'); // dequeue (FIFO)

// Sets (unique members)
await redis.sAdd('online:users', '42', '99', '123');
await redis.sIsMember('online:users', '42'); // 1

// Sorted Sets (leaderboard!)
await redis.zAdd('leaderboard', [
  { score: 9500, value: 'Alice' },
  { score: 8800, value: 'Bob' },
]);
await redis.zRange('leaderboard', 0, 9, { REV: true }); // top 10

// Pub/Sub
await publisher.publish('notifications:42', JSON.stringify(event));
await subscriber.subscribe('notifications:42', handler);
```

**Use cases:** Caching, sessions, rate limiting, leaderboards, pub/sub, distributed locks, real-time analytics.

**Performance:** Sub-millisecond reads/writes. ~100,000+ operations/second single node.

---

### 2. Document Stores

Stores semi-structured documents (typically JSON/BSON). Documents within a collection can have different schemas.

```json
// User document
{
  "_id": "64a1b2c3d4e5f6789abc0001",
  "name": "Alice",
  "email": "alice@example.com",
  "address": {
    "city": "Tokyo",
    "country": "Japan"
  },
  "tags": ["premium", "verified"],
  "orders": [
    { "id": "ord_123", "amount": 99.99, "date": "2024-01-15" }
  ]
}
```

**Examples:** MongoDB, Firestore, CouchDB, DynamoDB

**MongoDB:**

```javascript
const db = client.db('myapp');
const users = db.collection('users');

// Insert
await users.insertOne({ name: 'Alice', age: 30, tags: ['premium'] });
await users.insertMany([...]);

// Query
await users.findOne({ email: 'alice@example.com' });
await users.find({ age: { $gte: 18, $lte: 65 }, tags: 'premium' }).toArray();

// Projection (select specific fields)
await users.findOne({ _id: id }, { projection: { name: 1, email: 1, _id: 0 } });

// Update
await users.updateOne(
  { _id: id },
  {
    $set:  { name: 'Alice Smith' },        // set fields
    $push: { tags: 'verified' },           // append to array
    $inc:  { loginCount: 1 },              // increment
    $unset: { temporaryCode: '' },         // remove field
  }
);

// Aggregation Pipeline
const result = await users.aggregate([
  { $match: { age: { $gte: 18 } } },       // filter
  { $group: { _id: '$country', count: { $sum: 1 }, avgAge: { $avg: '$age' } } },
  { $sort: { count: -1 } },
  { $limit: 10 },
]).toArray();

// Indexes
await users.createIndex({ email: 1 }, { unique: true });
await users.createIndex({ tags: 1 });
await users.createIndex({ name: 'text', bio: 'text' }); // full-text search
```

**When MongoDB beats SQL:**
- Rapidly evolving schemas (startup MVP)
- Documents with nested arrays (orders with line items, articles with comments)
- Content management — each content type has different fields
- Read-heavy with complex nested access patterns

**MongoDB pitfalls:**
- No multi-document ACID before v4 (now supported)
- Joins (`$lookup`) are expensive vs SQL
- Easy to denormalise too much → data consistency issues

---

### 3. Wide-Column Stores

Rows have a fixed primary key, but can have millions of different columns. Optimised for **time-series and write-heavy workloads**.

**Examples:** Apache Cassandra, HBase, ScyllaDB, Google Bigtable

```sql
-- Cassandra Query Language (CQL)
CREATE TABLE sensor_readings (
  sensor_id  UUID,
  timestamp  TIMESTAMP,
  value      FLOAT,
  unit       TEXT,
  PRIMARY KEY (sensor_id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- Optimised for: "give me readings for sensor X from last hour"
SELECT * FROM sensor_readings
WHERE sensor_id = ? AND timestamp > now() - 1h;

-- Write throughput: Cassandra handles millions of writes/second
-- Data is append-only (like a log) — immutable by design
```

**Cassandra architecture:**
- No single point of failure — peer-to-peer
- Data partitioned by primary key hash across nodes
- **Eventual consistency** by default; tunable per-query
- `ConsistencyLevel.QUORUM` for strong consistency

**Use cases:** IoT time-series, event logs, activity feeds, write-heavy analytics, global replication.

---

### 4. Graph Databases

Data modelled as **nodes** (entities) and **edges** (relationships). Relationship traversal is first-class.

**Examples:** Neo4j, Amazon Neptune, ArangoDB

```cypher
-- Neo4j Cypher query language
-- Create nodes and relationships
CREATE (alice:User {name: 'Alice', age: 30})
CREATE (bob:User {name: 'Bob', age: 25})
CREATE (alice)-[:FOLLOWS {since: date('2024-01-01')}]->(bob)

-- Find friends of friends
MATCH (user:User {name: 'Alice'})-[:FOLLOWS*2]->(fof:User)
WHERE NOT (user)-[:FOLLOWS]->(fof)
RETURN fof.name

-- Shortest path between two nodes
MATCH path = shortestPath(
  (alice:User {name: 'Alice'})-[:FOLLOWS*]-(bob:User {name: 'Bob'})
)
RETURN path

-- Recommendation: "who do people I follow also follow?"
MATCH (me:User {name: 'Alice'})-[:FOLLOWS]->(friend)-[:FOLLOWS]->(rec)
WHERE NOT (me)-[:FOLLOWS]->(rec) AND me <> rec
RETURN rec.name, COUNT(*) AS commonFriends
ORDER BY commonFriends DESC LIMIT 10
```

**Use cases:** Social graphs, fraud detection, recommendation engines, knowledge graphs, network topology.

**Why not SQL for graphs?** In SQL, traversing 5 hops in a social graph requires 5 expensive JOINs. In Neo4j, pointer chasing through adjacency lists is O(log n) regardless of depth.

---

## CAP Theorem in Practice

```
         Consistency
              │
              │
Availability──┼──Partition Tolerance
```

Under a network partition, you must choose between **Consistency** (all nodes see the same data) and **Availability** (every request gets a response):

| System | Choice | Example |
|---|---|---|
| PostgreSQL, MySQL | CP (Consistency) | Refuses writes during partition |
| Cassandra, DynamoDB | AP (Availability) | Serves potentially stale reads |
| HBase | CP | Master-based, may be unavailable during partition |
| MongoDB | Configurable | Tunable via write concern |
| Redis Cluster | AP | May serve stale data from replicas |

---

## Choosing the Right NoSQL Type

| Need | Use |
|---|---|
| Caching, sessions, rate limiting | Redis (key-value) |
| Flexible schema, nested documents | MongoDB (document) |
| High-write time-series or event logs | Cassandra (wide-column) |
| Social graphs, recommendations, fraud | Neo4j (graph) |
| Full-text search | Elasticsearch |
| Global multi-region replication | DynamoDB, Cosmos DB, CockroachDB |

---

## When to Stick with SQL

Don't reach for NoSQL by default. Relational databases handle 95% of use cases well:

- ✅ Complex queries with JOINs across multiple entities
- ✅ Strong ACID requirements (financial transactions)
- ✅ Schema stability (enterprise, regulated industries)
- ✅ Reporting and analytics (window functions, aggregations)
- ✅ Team knows SQL; don't add operational complexity without clear benefit

The best database is usually **PostgreSQL** until you have a specific problem it can't solve.
