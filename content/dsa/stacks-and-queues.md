---
title: "Stacks & Queues"
category: "Data Structures & Algorithms"
difficulty: "beginner"
tags: ["stack", "queue", "deque", "monotonic-stack", "BFS", "DFS", "LIFO", "FIFO"]
order: 3
---

# Stacks & Queues

Two of the most fundamental data structures in computer science. Simple in principle, yet they underpin DFS, BFS, expression parsing, undo systems, and task scheduling.

---

## Stack — LIFO (Last In, First Out)

A stack allows insertion and removal only from the **top**.

### Operations & Complexity

| Operation | Time | Space |
|---|---|---|
| `push(x)` | O(1) | O(1) |
| `pop()` | O(1) | O(1) |
| `peek()` | O(1) | O(1) |
| `isEmpty()` | O(1) | O(1) |

```typescript
class Stack<T> {
  private data: T[] = [];

  push(item: T): void     { this.data.push(item); }
  pop(): T | undefined    { return this.data.pop(); }
  peek(): T | undefined   { return this.data[this.data.length - 1]; }
  isEmpty(): boolean      { return this.data.length === 0; }
  size(): number          { return this.data.length; }
}
```

### Pattern 1 — Balanced Parentheses

```typescript
function isValid(s: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  for (const ch of s) {
    if ('([{'.includes(ch)) {
      stack.push(ch);
    } else {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}
```

### Pattern 2 — Monotonic Stack

A monotonic stack maintains elements in strictly increasing or decreasing order. Ideal for **next greater element**, **largest rectangle in histogram**, **trapping rainwater**.

```typescript
// Next Greater Element — O(n)
function nextGreater(nums: number[]): number[] {
  const result = new Array(nums.length).fill(-1);
  const stack: number[] = []; // stores indices

  for (let i = 0; i < nums.length; i++) {
    // Pop all indices whose element is smaller than current
    while (stack.length > 0 && nums[stack[stack.length - 1]] < nums[i]) {
      result[stack.pop()!] = nums[i];
    }
    stack.push(i);
  }
  return result;
}
// [2,1,2,4,3] → [4,2,4,-1,-1]
```

### Pattern 3 — Evaluate Reverse Polish Notation

```typescript
function evalRPN(tokens: string[]): number {
  const stack: number[] = [];
  const ops: Record<string, (a: number, b: number) => number> = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => Math.trunc(a / b),
  };

  for (const token of tokens) {
    if (ops[token]) {
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(ops[token](a, b));
    } else {
      stack.push(Number(token));
    }
  }
  return stack[0];
}
```

---

## Queue — FIFO (First In, First Out)

A queue inserts at the **rear** and removes from the **front**.

```typescript
class Queue<T> {
  private data: T[] = [];
  private head = 0;

  enqueue(item: T): void { this.data.push(item); }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    const item = this.data[this.head++];
    // Amortized cleanup to prevent unbounded growth
    if (this.head > this.data.length / 2) {
      this.data = this.data.slice(this.head);
      this.head = 0;
    }
    return item;
  }

  peek(): T | undefined  { return this.data[this.head]; }
  isEmpty(): boolean     { return this.head >= this.data.length; }
  size(): number         { return this.data.length - this.head; }
}
```

> **Note:** Naively using `Array.shift()` is O(n). The head-pointer approach above is O(1) amortised.

### BFS with Queue

```typescript
function bfs(graph: Map<number, number[]>, start: number): number[] {
  const visited = new Set<number>();
  const queue = new Queue<number>();
  const order: number[] = [];

  queue.enqueue(start);
  visited.add(start);

  while (!queue.isEmpty()) {
    const node = queue.dequeue()!;
    order.push(node);

    for (const neighbor of (graph.get(node) ?? [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.enqueue(neighbor);
      }
    }
  }
  return order;
}
```

### Level-Order Tree Traversal

```typescript
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const result: number[][] = [];
  const queue: TreeNode[] = [root];

  while (queue.length > 0) {
    const level: number[] = [];
    const size = queue.length; // snapshot current level size

    for (let i = 0; i < size; i++) {
      const node = queue.shift()!;
      level.push(node.val);
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}
```

---

## Deque (Double-Ended Queue)

Supports O(1) insertion/removal from **both ends**. JavaScript's array isn't a true deque — use a doubly-linked list or a circular buffer for production.

### Sliding Window Maximum — O(n)

```typescript
function maxSlidingWindow(nums: number[], k: number): number[] {
  const deque: number[] = []; // stores indices, front is the max
  const result: number[] = [];

  for (let i = 0; i < nums.length; i++) {
    // Remove indices outside the window
    while (deque.length > 0 && deque[0] < i - k + 1) {
      deque.shift();
    }
    // Remove indices of smaller elements from back (monotonic decreasing)
    while (deque.length > 0 && nums[deque[deque.length - 1]] < nums[i]) {
      deque.pop();
    }
    deque.push(i);

    if (i >= k - 1) result.push(nums[deque[0]]);
  }
  return result;
}
// nums=[1,3,-1,-3,5,3,6,7], k=3 → [3,3,5,5,6,7]
```

---

## Priority Queue (Min-Heap)

A priority queue dequeues the **minimum** (or maximum) element first, not FIFO. Built on a heap internally.

```typescript
class MinHeap {
  private heap: number[] = [];

  push(val: number): void {
    this.heap.push(val);
    this._bubbleUp(this.heap.length - 1);
  }

  pop(): number | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  peek(): number { return this.heap[0]; }
  size(): number { return this.heap.length; }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent] <= this.heap[i]) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private _sinkDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l] < this.heap[smallest]) smallest = l;
      if (r < n && this.heap[r] < this.heap[smallest]) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}
```

---

## Common Interview Patterns

| Pattern | Problem Examples |
|---|---|
| Monotonic stack | Next Greater Element, Largest Rectangle in Histogram, Daily Temperatures |
| Stack for parsing | Valid Parentheses, Decode String, Basic Calculator |
| BFS (queue) | Shortest Path, Level-Order Traversal, Word Ladder |
| Sliding window (deque) | Sliding Window Maximum, Shortest Subarray with Sum ≥ K |
| Priority queue | Kth Largest Element, Merge K Sorted Lists, Task Scheduler |
