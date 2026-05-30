---
title: "Sorting & Searching Algorithms"
category: "Data Structures & Algorithms"
difficulty: "beginner"
tags: ["sorting", "searching", "binary-search", "merge-sort", "quick-sort"]
order: 6
---

# Sorting & Searching Algorithms

## Sorting Algorithm Comparison

| Algorithm | Best | Average | Worst | Space | Stable? |
|---|---|---|---|---|---|
| Bubble Sort | O(n) | O(n²) | O(n²) | O(1) | ✅ |
| Selection Sort | O(n²) | O(n²) | O(n²) | O(1) | ❌ |
| Insertion Sort | O(n) | O(n²) | O(n²) | O(1) | ✅ |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) | ✅ |
| Quick Sort | O(n log n) | O(n log n) | O(n²) | O(log n) | ❌ |
| Heap Sort | O(n log n) | O(n log n) | O(n log n) | O(1) | ❌ |
| Counting Sort | O(n + k) | O(n + k) | O(n + k) | O(k) | ✅ |
| Radix Sort | O(d(n + k)) | O(d(n + k)) | O(d(n + k)) | O(n + k) | ✅ |

## Merge Sort

Divide-and-conquer. **Always O(n log n).** Stable. Extra O(n) space.

```typescript
function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(a: number[], b: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) result.push(a[i++]);
    else result.push(b[j++]);
  }
  return result.concat(a.slice(i), b.slice(j));
}
```

## Quick Sort

Divide-and-conquer using a pivot. **Average O(n log n), worst O(n²)** (mitigated by random pivot).

```typescript
function quickSort(arr: number[], lo = 0, hi = arr.length - 1): number[] {
  if (lo < hi) {
    const pivotIdx = partition(arr, lo, hi);
    quickSort(arr, lo, pivotIdx - 1);
    quickSort(arr, pivotIdx + 1, hi);
  }
  return arr;
}

function partition(arr: number[], lo: number, hi: number): number {
  // Random pivot to avoid worst case
  const randomIdx = lo + Math.floor(Math.random() * (hi - lo + 1));
  [arr[randomIdx], arr[hi]] = [arr[hi], arr[randomIdx]];

  const pivot = arr[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }
  [arr[i], arr[hi]] = [arr[hi], arr[i]];
  return i;
}
```

## Binary Search

**Prerequisite:** Sorted input. **Time:** O(log n)

### Standard Template

```typescript
function binarySearch(arr: number[], target: number): number {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2); // avoid overflow
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1; // not found
}
```

### Find Left Boundary (first occurrence)

```typescript
function lowerBound(arr: number[], target: number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo; // first index where arr[i] >= target
}
```

### Find Right Boundary (last occurrence)

```typescript
function upperBound(arr: number[], target: number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1; // last index where arr[i] <= target
}
```

### Binary Search on Answer

When you can't search an array directly but can binary-search the answer space.

```typescript
// Example: Minimum capacity to ship packages within D days
function shipWithinDays(weights: number[], days: number): number {
  let lo = Math.max(...weights);
  let hi = weights.reduce((a, b) => a + b, 0);

  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (canShip(weights, days, mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

function canShip(weights: number[], days: number, capacity: number): boolean {
  let currentLoad = 0, daysNeeded = 1;
  for (const w of weights) {
    if (currentLoad + w > capacity) {
      daysNeeded++;
      currentLoad = 0;
    }
    currentLoad += w;
  }
  return daysNeeded <= days;
}
```

## When to Use Which Sort

| Scenario | Best Choice | Reason |
|---|---|---|
| Small arrays (n < 50) | Insertion Sort | Low overhead, great cache perf |
| General purpose | Quick Sort | Best average, in-place |
| Stability required | Merge Sort | Guaranteed O(n log n), stable |
| Nearly sorted data | Insertion Sort | Becomes O(n) |
| Known small range of values | Counting Sort | O(n + k) linear |
| Linked list data | Merge Sort | No random access needed |
| External sorting (disk) | Merge Sort | Sequential access pattern |
