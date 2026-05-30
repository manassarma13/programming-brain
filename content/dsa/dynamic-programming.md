---
title: "Dynamic Programming & Backtracking"
category: "Data Structures & Algorithms"
difficulty: "advanced"
tags: ["dynamic-programming", "memoization", "tabulation", "backtracking", "recursion"]
order: 7
---

# Dynamic Programming & Backtracking

## Dynamic Programming (DP)

DP solves problems by breaking them into **overlapping subproblems** with **optimal substructure**. Two approaches:

| Approach | Direction | Pros | Cons |
|---|---|---|---|
| **Memoization** (top-down) | Recursive + cache | Only computes needed states | Stack overflow risk, overhead |
| **Tabulation** (bottom-up) | Iterative, fill table | No recursion overhead, space-optimizable | Computes all states |

### 1D DP — Fibonacci / Climbing Stairs

```typescript
// Memoization
function climbStairsMemo(n: number, memo: Map<number, number> = new Map()): number {
  if (n <= 2) return n;
  if (memo.has(n)) return memo.get(n)!;
  const result = climbStairsMemo(n - 1, memo) + climbStairsMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}

// Tabulation
function climbStairsTab(n: number): number {
  if (n <= 2) return n;
  let prev2 = 1, prev1 = 2;
  for (let i = 3; i <= n; i++) {
    const curr = prev1 + prev2;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}
```

### 1D DP — Coin Change (unbounded knapsack variant)

```typescript
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i && dp[i - coin] !== Infinity) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

**Time:** O(amount × coins) | **Space:** O(amount)

### 1D DP — Longest Increasing Subsequence (LIS)

```typescript
// O(n²) approach
function lisQuadratic(nums: number[]): number {
  const dp = new Array(nums.length).fill(1);
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
    }
  }
  return Math.max(...dp);
}

// O(n log n) approach using patience sorting
function lisOptimal(nums: number[]): number {
  const tails: number[] = [];
  for (const num of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < num) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = num;
  }
  return tails.length;
}
```

### 2D DP — 0/1 Knapsack

```typescript
function knapsack(weights: number[], values: number[], capacity: number): number {
  const n = weights.length;
  // dp[i][w] = max value using items 0..i-1 with capacity w
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(capacity + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w]; // skip item
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
      }
    }
  }
  return dp[n][capacity];
}

// Space-optimized to O(capacity)
function knapsackOptimized(weights: number[], values: number[], capacity: number): number {
  const dp = new Array(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let w = capacity; w >= weights[i]; w--) { // reverse to avoid reuse
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
}
```

### 2D DP — Longest Common Subsequence

```typescript
function lcs(text1: string, text2: string): number {
  const m = text1.length, n = text2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}
```

### 2D DP — Grid Paths (Unique Paths)

```typescript
function uniquePaths(m: number, n: number): number {
  const dp: number[][] = Array.from({ length: m }, () => new Array(n).fill(1));
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
    }
  }
  return dp[m - 1][n - 1];
}
```

## DP Problem Classification

| Category | Examples | Key Insight |
|---|---|---|
| **Linear (1D)** | Climbing Stairs, House Robber, Decode Ways | `dp[i]` depends on previous states |
| **Knapsack** | 0/1 Knapsack, Coin Change, Subset Sum | Include/exclude decision per item |
| **String** | LCS, Edit Distance, Palindrome | Two strings → 2D table |
| **Grid** | Unique Paths, Min Path Sum | `dp[i][j]` from top/left neighbors |
| **Interval** | Matrix Chain, Burst Balloons | `dp[i][j]` = optimal for range [i..j] |
| **Bitmask** | TSP, Assign tasks to workers | State = bitmask of chosen items |

---

## Backtracking

Backtracking builds solutions incrementally and **abandons (prunes)** branches that violate constraints.

### Template

```typescript
function backtrack(
  candidates: number[],
  path: number[],
  results: number[][],
  start: number
): void {
  if (isValid(path)) {
    results.push([...path]); // deep copy
    return;
  }

  for (let i = start; i < candidates.length; i++) {
    // Pruning: skip invalid choices early
    if (!canChoose(candidates[i], path)) continue;

    path.push(candidates[i]);       // choose
    backtrack(candidates, path, results, i + 1); // explore
    path.pop();                       // un-choose (backtrack)
  }
}
```

### Subsets (Power Set)

```typescript
function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  function bt(start: number, path: number[]): void {
    result.push([...path]);
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      bt(i + 1, path);
      path.pop();
    }
  }
  bt(0, []);
  return result;
}
```

### Permutations

```typescript
function permutations(nums: number[]): number[][] {
  const result: number[][] = [];
  const used = new Array(nums.length).fill(false);

  function bt(path: number[]): void {
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(nums[i]);
      bt(path);
      path.pop();
      used[i] = false;
    }
  }
  bt([]);
  return result;
}
```

### N-Queens

```typescript
function solveNQueens(n: number): string[][] {
  const result: string[][] = [];
  const board: string[][] = Array.from({ length: n }, () => new Array(n).fill('.'));
  const cols = new Set<number>();
  const diag1 = new Set<number>(); // row - col
  const diag2 = new Set<number>(); // row + col

  function bt(row: number): void {
    if (row === n) {
      result.push(board.map(r => r.join('')));
      return;
    }
    for (let col = 0; col < n; col++) {
      if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) continue;
      board[row][col] = 'Q';
      cols.add(col); diag1.add(row - col); diag2.add(row + col);
      bt(row + 1);
      board[row][col] = '.';
      cols.delete(col); diag1.delete(row - col); diag2.delete(row + col);
    }
  }
  bt(0);
  return result;
}
```

## DP vs Backtracking — Decision Guide

| Question | DP | Backtracking |
|---|---|---|
| Need optimal value (min/max/count)? | ✅ | Possible but slower |
| Need all valid solutions enumerated? | ❌ | ✅ |
| Overlapping subproblems? | ✅ | Not required |
| Constraints allow pruning? | N/A | ✅ (prune early) |
