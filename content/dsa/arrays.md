---
title: "Arrays"
category: "Data Structures & Algorithms"
difficulty: "beginner"
tags: ["arrays", "contiguous-memory", "indexing", "sliding-window"]
order: 1
---

# Arrays

An **array** is a contiguous block of memory storing elements of the same type, accessible in **O(1)** via index arithmetic.

## Core Operations & Complexity

| Operation | Average | Worst |
|---|---|---|
| Access by index | O(1) | O(1) |
| Search (unsorted) | O(n) | O(n) |
| Search (sorted — binary) | O(log n) | O(log n) |
| Insert at end (dynamic) | O(1) amortized | O(n) |
| Insert at arbitrary index | O(n) | O(n) |
| Delete at arbitrary index | O(n) | O(n) |

**Space Complexity:** O(n)

## Static vs Dynamic Arrays

| Aspect | Static Array | Dynamic Array (e.g. `std::vector`, JS `Array`) |
|---|---|---|
| Size | Fixed at compile time | Grows at runtime |
| Resize cost | N/A | O(n) copy on capacity doubling |
| Memory overhead | None | Extra capacity buffer |

## Key Patterns

### 1. Two Pointers

Shrink a search space from both ends — ideal for sorted arrays.

```typescript
function twoSumSorted(nums: number[], target: number): [number, number] {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const sum = nums[lo] + nums[hi];
    if (sum === target) return [lo, hi];
    sum < target ? lo++ : hi--;
  }
  return [-1, -1]; // not found
}
```

**When to use:** sorted input, palindrome checks, container-with-water problems.

### 2. Sliding Window

Maintain a window `[left, right)` and expand/contract to satisfy a constraint.

```typescript
function maxSumSubarray(nums: number[], k: number): number {
  let windowSum = 0, maxSum = -Infinity;
  for (let i = 0; i < nums.length; i++) {
    windowSum += nums[i];
    if (i >= k) windowSum -= nums[i - k];
    if (i >= k - 1) maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
}
```

**When to use:** contiguous subarray/substring problems, fixed or variable-size windows.

### 3. Prefix Sum

Pre-compute cumulative sums for O(1) range queries.

```typescript
function buildPrefixSum(nums: number[]): number[] {
  const prefix = new Array(nums.length + 1).fill(0);
  for (let i = 0; i < nums.length; i++) {
    prefix[i + 1] = prefix[i] + nums[i];
  }
  return prefix;
}

// Sum of nums[l..r] inclusive
function rangeSum(prefix: number[], l: number, r: number): number {
  return prefix[r + 1] - prefix[l];
}
```

### 4. Kadane's Algorithm (Maximum Subarray)

```typescript
function maxSubarraySum(nums: number[]): number {
  let current = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}
```

**Time:** O(n) | **Space:** O(1)

## Real-World Trade-offs

- **Cache-friendliness:** Arrays shine due to spatial locality — sequential reads are 10–100× faster than pointer-chasing in linked lists.
- **Insert-heavy workloads:** Prefer a linked list or a balanced BST if frequent mid-array insertions dominate.
- **Sparse data:** Use hash maps instead of allocating huge arrays with mostly empty slots.

## Common Interview Patterns

| Pattern | Example Problems |
|---|---|
| Two Pointers | 3Sum, Container With Most Water |
| Sliding Window | Longest Substring Without Repeating Characters |
| Prefix Sum | Subarray Sum Equals K |
| Kadane's | Maximum Subarray |
| Dutch National Flag | Sort Colors |
| Merge Intervals | Meeting Rooms II |
