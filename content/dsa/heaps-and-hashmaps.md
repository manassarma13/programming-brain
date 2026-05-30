---
title: "Heaps & Hash Maps"
category: "Data Structures & Algorithms"
difficulty: "intermediate"
tags: ["heap", "priority-queue", "hash-map", "hash-table", "collision-handling"]
order: 5
---

# Heaps & Hash Maps

Two foundational data structures that power everything from schedulers to databases.

---

## Heaps (Priority Queues)

A **heap** is a complete binary tree satisfying the heap property:
- **Min-Heap:** Parent ≤ children (root = minimum)
- **Max-Heap:** Parent ≥ children (root = maximum)

### Complexity

| Operation | Time |
|---|---|
| Insert (push) | O(log n) |
| Extract min/max (pop) | O(log n) |
| Peek min/max | O(1) |
| Build heap from array | O(n) |
| Search | O(n) |

**Space:** O(n)

### Array-Based Implementation

```typescript
class MinHeap {
  private data: number[] = [];

  get size(): number { return this.data.length; }
  peek(): number | undefined { return this.data[0]; }

  push(val: number): void {
    this.data.push(val);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): number | undefined {
    if (!this.data.length) return undefined;
    const min = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return min;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.data[parent] <= this.data[i]) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.data[left] < this.data[smallest]) smallest = left;
      if (right < n && this.data[right] < this.data[smallest]) smallest = right;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}
```

### Practical Use Cases

| Problem | Heap Type | Why |
|---|---|---|
| Top K elements | Min-heap of size K | Evict smallest, keep K largest |
| Merge K sorted lists | Min-heap | Always extract global minimum |
| Median in a stream | Max-heap + Min-heap | Balance two halves |
| Task scheduler | Max-heap | Prioritize most frequent task |
| Dijkstra's algorithm | Min-heap | Always expand closest vertex |

### Top K Elements Pattern

```typescript
function topKFrequent(nums: number[], k: number): number[] {
  const freq = new Map<number, number>();
  for (const n of nums) freq.set(n, (freq.get(n) ?? 0) + 1);

  // Bucket sort approach — O(n) instead of heap O(n log k)
  const buckets: number[][] = new Array(nums.length + 1).fill(null).map(() => []);
  for (const [num, count] of freq) buckets[count].push(num);

  const result: number[] = [];
  for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
    result.push(...buckets[i]);
  }
  return result.slice(0, k);
}
```

---

## Hash Maps (Hash Tables)

A **hash map** maps keys to values using a hash function, providing average O(1) lookups.

### Complexity

| Operation | Average | Worst |
|---|---|---|
| Insert | O(1) | O(n) |
| Search | O(1) | O(n) |
| Delete | O(1) | O(n) |

**Space:** O(n)

Worst case occurs when all keys collide into the same bucket.

### Collision Resolution Strategies

| Strategy | Description | Pros | Cons |
|---|---|---|---|
| **Chaining** | Each bucket → linked list | Simple, handles high load | Extra pointer memory |
| **Open Addressing** | Probe for next empty slot | Cache-friendly | Clustering issues |
| **Robin Hood Hashing** | Steal from rich buckets | Low variance in probe length | Complex implementation |

### Implementation (Chaining)

```typescript
class HashMap<K, V> {
  private buckets: [K, V][][];
  private capacity: number;
  private count = 0;
  private readonly LOAD_FACTOR = 0.75;

  constructor(capacity = 16) {
    this.capacity = capacity;
    this.buckets = new Array(capacity).fill(null).map(() => []);
  }

  private hash(key: K): number {
    const str = String(key);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash) % this.capacity;
  }

  set(key: K, value: V): void {
    const idx = this.hash(key);
    const bucket = this.buckets[idx];
    const existing = bucket.find(([k]) => k === key);
    if (existing) {
      existing[1] = value;
    } else {
      bucket.push([key, value]);
      this.count++;
      if (this.count / this.capacity > this.LOAD_FACTOR) this.resize();
    }
  }

  get(key: K): V | undefined {
    const idx = this.hash(key);
    const pair = this.buckets[idx].find(([k]) => k === key);
    return pair?.[1];
  }

  delete(key: K): boolean {
    const idx = this.hash(key);
    const bucket = this.buckets[idx];
    const i = bucket.findIndex(([k]) => k === key);
    if (i === -1) return false;
    bucket.splice(i, 1);
    this.count--;
    return true;
  }

  private resize(): void {
    const old = this.buckets;
    this.capacity *= 2;
    this.buckets = new Array(this.capacity).fill(null).map(() => []);
    this.count = 0;
    for (const bucket of old) {
      for (const [key, value] of bucket) {
        this.set(key, value);
      }
    }
  }
}
```

### Essential Hash Map Patterns

#### Two-Sum (Classic)

```typescript
function twoSum(nums: number[], target: number): [number, number] {
  const map = new Map<number, number>(); // value → index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement)!, i];
    map.set(nums[i], i);
  }
  return [-1, -1];
}
```

#### Group Anagrams

```typescript
function groupAnagrams(strs: string[]): string[][] {
  const map = new Map<string, string[]>();
  for (const s of strs) {
    const key = s.split("").sort().join("");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.values());
}
```

#### LRU Cache (Hash Map + Doubly Linked List)

```typescript
class LRUCache {
  private capacity: number;
  private cache = new Map<number, number>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: number): number {
    if (!this.cache.has(key)) return -1;
    const val = this.cache.get(key)!;
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  put(key: number, value: number): void {
    this.cache.delete(key); // remove if exists (re-insert at end)
    this.cache.set(key, value);
    if (this.cache.size > this.capacity) {
      // Delete least recently used (first key)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey!);
    }
  }
}
```

## Design Considerations

- **Hash function quality** directly impacts performance. Poor hash functions cause clustering.
- **Load factor** (n/capacity) should stay below 0.75 for chaining, 0.5–0.7 for open addressing.
- **Resizing** doubles capacity and rehashes all entries — an O(n) operation amortized across insertions.
- In JavaScript, `Map` preserves insertion order and uses a high-quality internal hash — prefer it over plain objects for dynamic key sets.
