---
title: "Bit Manipulation"
category: "Data Structures & Algorithms"
difficulty: "intermediate"
tags: ["bit-manipulation", "bitwise", "XOR", "bitmask", "binary", "bit-tricks", "low-level"]
order: 8
---

# Bit Manipulation

Bit manipulation operates directly on the binary representation of numbers. It unlocks O(1) solutions to problems that would otherwise require O(n) space or complex logic, and it's foundational to systems programming, cryptography, and competitive programming.

---

## Binary Representation

Every integer is stored as a sequence of bits. In two's complement (used by all modern CPUs):

```
Positive 5:  00000101
Positive 6:  00000110
Negative 5:  11111011  (flip bits + 1)

JavaScript uses 32-bit signed integers for bitwise operations.
Number.MAX_SAFE_INTEGER = 2^53 - 1 (53-bit float mantissa)
Use BigInt for 64-bit bit manipulation.
```

---

## Bitwise Operators

| Operator | Name | Example | Result |
|---|---|---|---|
| `&` | AND | `6 & 5` → `110 & 101` | `100` = 4 |
| `\|` | OR | `6 \| 5` → `110 \| 101` | `111` = 7 |
| `^` | XOR | `6 ^ 5` → `110 ^ 101` | `011` = 3 |
| `~` | NOT | `~5` → `~00000101` | `11111010` = -6 |
| `<<` | Left shift | `5 << 1` → `101 << 1` | `1010` = 10 |
| `>>` | Signed right shift | `-8 >> 1` | -4 (preserves sign) |
| `>>>` | Unsigned right shift | `-1 >>> 0` | 4294967295 |

---

## Essential Bit Tricks

```typescript
// Check if bit i is set
function isBitSet(n: number, i: number): boolean {
  return (n & (1 << i)) !== 0;
}

// Set bit i
function setBit(n: number, i: number): number {
  return n | (1 << i);
}

// Clear bit i
function clearBit(n: number, i: number): number {
  return n & ~(1 << i);
}

// Toggle bit i
function toggleBit(n: number, i: number): number {
  return n ^ (1 << i);
}

// Check if n is even/odd (faster than n % 2)
const isEven = (n: number) => (n & 1) === 0;
const isOdd  = (n: number) => (n & 1) === 1;

// Check if n is a power of 2
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}
// n=8: 1000 & 0111 = 0000 ✓ | n=6: 0110 & 0101 = 0100 ✗

// Get lowest set bit (isolate rightmost 1)
const lowestSetBit = (n: number) => n & (-n);
// n=12 (1100): -12 = 0100 in two's complement → 1100 & 0100 = 0100

// Clear lowest set bit
const clearLowestSetBit = (n: number) => n & (n - 1);
// n=12 (1100): 12-1=11 (1011) → 1100 & 1011 = 1000

// Count set bits (Brian Kernighan's algorithm)
function countBits(n: number): number {
  let count = 0;
  while (n > 0) {
    n &= (n - 1); // clear lowest set bit each iteration
    count++;
  }
  return count;
}
// Time: O(k) where k = number of set bits

// Multiply / divide by powers of 2
const multiplyBy2 = (n: number) => n << 1;
const divideBy2   = (n: number) => n >> 1;
const multiplyBy8 = (n: number) => n << 3;
```

---

## XOR Properties — The Magic Operator

XOR has remarkable mathematical properties:
- `a ^ a = 0` — XOR with itself = 0
- `a ^ 0 = a` — XOR with 0 = identity
- Commutative: `a ^ b = b ^ a`
- Associative: `(a ^ b) ^ c = a ^ (b ^ c)`

```typescript
// Single Number — find the one element that doesn't have a pair
// All duplicates cancel out: a ^ a = 0
function singleNumber(nums: number[]): number {
  return nums.reduce((acc, n) => acc ^ n, 0);
}
// [4,1,2,1,2] → 4^1^2^1^2 = 4^(1^1)^(2^2) = 4^0^0 = 4

// Swap without temp variable
function swap(a: number, b: number): [number, number] {
  a ^= b; // a = a^b
  b ^= a; // b = b^(a^b) = a
  a ^= b; // a = (a^b)^a = b
  return [a, b];
}

// Missing Number (0 to n)
function missingNumber(nums: number[]): number {
  let xor = nums.length;
  for (let i = 0; i < nums.length; i++) {
    xor ^= i ^ nums[i];
  }
  return xor;
}
// Every index and its expected value cancel, leaving only the missing number
```

---

## Bitmasks for State Sets

A bitmask represents a **set of states** using individual bits. With a 32-bit integer you can represent a set of 32 elements in O(1) space.

```typescript
// Represent permissions as bits
const PERMISSIONS = {
  READ:    1 << 0, // 0001
  WRITE:   1 << 1, // 0010
  EXECUTE: 1 << 2, // 0100
  ADMIN:   1 << 3, // 1000
} as const;

class PermissionManager {
  private mask = 0;

  grant(perm: number)  { this.mask |= perm; }
  revoke(perm: number) { this.mask &= ~perm; }
  has(perm: number)    { return (this.mask & perm) === perm; }
  hasAny(perm: number) { return (this.mask & perm) !== 0; }
}

const mgr = new PermissionManager();
mgr.grant(PERMISSIONS.READ | PERMISSIONS.WRITE); // mask = 0011
mgr.has(PERMISSIONS.READ);   // true
mgr.has(PERMISSIONS.ADMIN);  // false
mgr.revoke(PERMISSIONS.WRITE); // mask = 0001
```

### DP on Subsets with Bitmask

Bitmask DP solves problems involving **all subsets** of a set — the Travelling Salesman Problem, minimum cost to cover all nodes, etc.

```typescript
// Minimum cost to visit all cities (TSP) — O(2^n × n^2)
function tsp(dist: number[][]): number {
  const n = dist.length;
  const FULL = (1 << n) - 1; // all bits set = all cities visited
  const dp = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));

  dp[1][0] = 0; // start at city 0, only city 0 visited (bit 0 set)

  for (let mask = 1; mask <= FULL; mask++) {
    for (let u = 0; u < n; u++) {
      if (!(mask & (1 << u))) continue;        // u not in current set
      if (dp[mask][u] === Infinity) continue;

      for (let v = 0; v < n; v++) {
        if (mask & (1 << v)) continue;          // v already visited
        const nextMask = mask | (1 << v);
        dp[nextMask][v] = Math.min(
          dp[nextMask][v],
          dp[mask][u] + dist[u][v]
        );
      }
    }
  }

  return Math.min(...Array.from({ length: n }, (_, v) => dp[FULL][v] + dist[v][0]));
}
```

---

## Practical Interview Problems

### Count Bits for 0 to n — O(n)

```typescript
function countBitsDP(n: number): number[] {
  const dp = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    // If i is even: same bits as i/2
    // If i is odd:  same bits as i-1, plus 1
    dp[i] = dp[i >> 1] + (i & 1);
  }
  return dp;
}
// 0→1→2→3→4: [0,1,1,2,1]
```

### Find Two Non-Duplicate Numbers

```typescript
// Two numbers appear once; all others appear twice
function singleNumberIII(nums: number[]): number[] {
  // XOR of all nums = XOR of the two unique numbers (a ^ b)
  const xor = nums.reduce((acc, n) => acc ^ n, 0);

  // Find any set bit in xor — this bit differs between a and b
  const diffBit = xor & (-xor); // lowest set bit

  // Split into two groups by diffBit, XOR each group separately
  let a = 0, b = 0;
  for (const n of nums) {
    if (n & diffBit) a ^= n;
    else             b ^= n;
  }
  return [a, b];
}
```

### Reverse Bits

```typescript
function reverseBits(n: number): number {
  let result = 0;
  for (let i = 0; i < 32; i++) {
    result = (result << 1) | (n & 1);
    n >>>= 1;
  }
  return result >>> 0; // convert to unsigned 32-bit
}
```

---

## Common Patterns Table

| Pattern | Code | Use case |
|---|---|---|
| Check bit i | `n & (1 << i)` | Permission checks |
| Set bit i | `n \| (1 << i)` | Enable a flag |
| Clear bit i | `n & ~(1 << i)` | Disable a flag |
| Power of 2 | `n > 0 && !(n & n-1)` | Validate sizes |
| Lowest set bit | `n & (-n)` | Fenwick tree, iterate bits |
| Count set bits | `n &= n-1` loop | Hamming weight |
| XOR all | `reduce(^, 0)` | Find single/missing |
| Subset iteration | `mask = (mask-1) & set` | Enumerate subsets |
