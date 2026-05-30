---
title: "Trees — BST & Trie"
category: "Data Structures & Algorithms"
difficulty: "intermediate"
tags: ["tree", "binary-search-tree", "trie", "prefix-tree", "traversal"]
order: 3
---

# Trees — BST & Trie

Trees are hierarchical data structures where each node has zero or more children, with exactly one root and no cycles.

## Binary Tree Traversals

```typescript
class TreeNode {
  val: number;
  left: TreeNode | null = null;
  right: TreeNode | null = null;
  constructor(val: number) { this.val = val; }
}

// In-order: Left → Root → Right (gives sorted order for BST)
function inorder(root: TreeNode | null, result: number[] = []): number[] {
  if (!root) return result;
  inorder(root.left, result);
  result.push(root.val);
  inorder(root.right, result);
  return result;
}

// Pre-order: Root → Left → Right (serialize/copy tree)
function preorder(root: TreeNode | null, result: number[] = []): number[] {
  if (!root) return result;
  result.push(root.val);
  preorder(root.left, result);
  preorder(root.right, result);
  return result;
}

// Level-order (BFS)
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  while (queue.length) {
    const level: number[] = [];
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const node = queue.shift()!;
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}
```

## Binary Search Tree (BST)

**Invariant:** For every node, all values in the left subtree are less, and all values in the right subtree are greater.

### Complexity

| Operation | Average | Worst (degenerate) |
|---|---|---|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| In-order traversal | O(n) | O(n) |

**Space:** O(n)

### BST Operations

```typescript
function searchBST(root: TreeNode | null, target: number): TreeNode | null {
  if (!root || root.val === target) return root;
  return target < root.val
    ? searchBST(root.left, target)
    : searchBST(root.right, target);
}

function insertBST(root: TreeNode | null, val: number): TreeNode {
  if (!root) return new TreeNode(val);
  if (val < root.val) root.left = insertBST(root.left, val);
  else if (val > root.val) root.right = insertBST(root.right, val);
  return root;
}

function findMin(node: TreeNode): TreeNode {
  while (node.left) node = node.left;
  return node;
}

function deleteBST(root: TreeNode | null, val: number): TreeNode | null {
  if (!root) return null;
  if (val < root.val) {
    root.left = deleteBST(root.left, val);
  } else if (val > root.val) {
    root.right = deleteBST(root.right, val);
  } else {
    // Node found
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    // Two children: replace with inorder successor
    const successor = findMin(root.right);
    root.val = successor.val;
    root.right = deleteBST(root.right, successor.val);
  }
  return root;
}
```

### Validate BST

```typescript
function isValidBST(
  root: TreeNode | null,
  min = -Infinity,
  max = Infinity
): boolean {
  if (!root) return true;
  if (root.val <= min || root.val >= max) return false;
  return (
    isValidBST(root.left, min, root.val) &&
    isValidBST(root.right, root.val, max)
  );
}
```

## Trie (Prefix Tree)

A **Trie** stores strings character-by-character, sharing common prefixes. Ideal for autocomplete, spell-check, and IP routing.

### Complexity

| Operation | Time |
|---|---|
| Insert | O(m) — m = word length |
| Search | O(m) |
| Prefix search | O(m) |
| Space | O(Σ × m × n) — Σ = alphabet size |

### Implementation

```typescript
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd = false;
}

class Trie {
  root = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch)!;
    }
    node.isEnd = true;
  }

  search(word: string): boolean {
    const node = this._traverse(word);
    return node !== null && node.isEnd;
  }

  startsWith(prefix: string): boolean {
    return this._traverse(prefix) !== null;
  }

  // Autocomplete: return all words with given prefix
  autocomplete(prefix: string): string[] {
    const node = this._traverse(prefix);
    if (!node) return [];
    const results: string[] = [];
    this._dfs(node, prefix, results);
    return results;
  }

  private _traverse(word: string): TrieNode | null {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) return null;
      node = node.children.get(ch)!;
    }
    return node;
  }

  private _dfs(node: TrieNode, path: string, results: string[]): void {
    if (node.isEnd) results.push(path);
    for (const [ch, child] of node.children) {
      this._dfs(child, path + ch, results);
    }
  }
}
```

## Self-Balancing Trees — When to Use

| Structure | Balance Guarantee | Use Case |
|---|---|---|
| AVL Tree | Strict (height diff ≤ 1) | Read-heavy (databases) |
| Red-Black Tree | Relaxed | Write-heavy (Linux CFS, `std::map`) |
| B-Tree | Multi-way, disk-optimized | File systems, databases |
| Splay Tree | Amortized via rotations | Caching, recently-accessed data |

## Common Interview Problems

| Problem | Key Technique |
|---|---|
| Lowest Common Ancestor | Recursive split at BST |
| Serialize/Deserialize | Pre-order + null markers |
| Diameter of Binary Tree | DFS tracking max depth sum |
| Kth Smallest in BST | Inorder traversal with counter |
| Word Search II | Trie + backtracking on grid |
