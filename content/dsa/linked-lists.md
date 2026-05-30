---
title: "Linked Lists"
category: "Data Structures & Algorithms"
difficulty: "beginner"
tags: ["linked-list", "singly-linked", "doubly-linked", "pointer-manipulation"]
order: 2
---

# Linked Lists

A **linked list** is a linear data structure where each element (node) contains a value and a pointer to the next node. Unlike arrays, nodes are scattered in memory.

## Types

| Type | Pointers | Use Case |
|---|---|---|
| Singly Linked | `next` only | Stacks, simple queues |
| Doubly Linked | `next` + `prev` | LRU Cache, browser history |
| Circular | Tail → Head | Round-robin scheduling |

## Core Operations & Complexity

| Operation | Singly | Doubly |
|---|---|---|
| Access by index | O(n) | O(n) |
| Insert at head | O(1) | O(1) |
| Insert at tail (with tail pointer) | O(1) | O(1) |
| Delete given node reference | O(n)* | O(1) |
| Search | O(n) | O(n) |

*O(1) if you copy the next node's value and delete the next node instead.

**Space Complexity:** O(n)

## Implementation

```typescript
class ListNode<T> {
  val: T;
  next: ListNode<T> | null = null;

  constructor(val: T) {
    this.val = val;
  }
}

class SinglyLinkedList<T> {
  head: ListNode<T> | null = null;
  private size = 0;

  prepend(val: T): void {
    const node = new ListNode(val);
    node.next = this.head;
    this.head = node;
    this.size++;
  }

  append(val: T): void {
    const node = new ListNode(val);
    if (!this.head) {
      this.head = node;
    } else {
      let curr = this.head;
      while (curr.next) curr = curr.next;
      curr.next = node;
    }
    this.size++;
  }

  deleteByValue(val: T): boolean {
    if (!this.head) return false;
    if (this.head.val === val) {
      this.head = this.head.next;
      this.size--;
      return true;
    }
    let curr = this.head;
    while (curr.next && curr.next.val !== val) curr = curr.next;
    if (curr.next) {
      curr.next = curr.next.next;
      this.size--;
      return true;
    }
    return false;
  }

  toArray(): T[] {
    const result: T[] = [];
    let curr = this.head;
    while (curr) {
      result.push(curr.val);
      curr = curr.next;
    }
    return result;
  }

  get length(): number {
    return this.size;
  }
}
```

## Essential Patterns

### 1. Fast & Slow Pointers (Floyd's Cycle Detection)

```typescript
function hasCycle(head: ListNode<number> | null): boolean {
  let slow = head, fast = head;
  while (fast?.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

function findCycleStart(head: ListNode<number> | null): ListNode<number> | null {
  let slow = head, fast = head;
  while (fast?.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) break;
  }
  if (!fast?.next) return null;
  slow = head;
  while (slow !== fast) {
    slow = slow!.next;
    fast = fast!.next;
  }
  return slow;
}
```

### 2. Reverse a Linked List (Iterative)

```typescript
function reverseList(head: ListNode<number> | null): ListNode<number> | null {
  let prev: ListNode<number> | null = null;
  let curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}
```

### 3. Merge Two Sorted Lists

```typescript
function mergeTwoLists(
  l1: ListNode<number> | null,
  l2: ListNode<number> | null
): ListNode<number> | null {
  const dummy = new ListNode(0);
  let tail = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) {
      tail.next = l1;
      l1 = l1.next;
    } else {
      tail.next = l2;
      l2 = l2.next;
    }
    tail = tail.next;
  }
  tail.next = l1 ?? l2;
  return dummy.next;
}
```

### 4. Find Middle Node

```typescript
function findMiddle(head: ListNode<number> | null): ListNode<number> | null {
  let slow = head, fast = head;
  while (fast?.next) {
    slow = slow!.next;
    fast = fast.next.next;
  }
  return slow;
}
```

## Arrays vs Linked Lists — When to Choose

| Factor | Array | Linked List |
|---|---|---|
| Random access | ✅ O(1) | ❌ O(n) |
| Insert/delete at ends | O(1) amortized | O(1) |
| Insert/delete in middle | O(n) shift | O(1) with reference |
| Cache performance | Excellent (contiguous) | Poor (scattered) |
| Memory overhead | Low | High (pointers per node) |

**Rule of thumb:** Use linked lists when you need frequent insertions/deletions with known references (e.g., LRU cache). Use arrays for everything else.
