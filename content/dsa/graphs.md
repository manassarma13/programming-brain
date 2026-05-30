---
title: "Graphs"
category: "Data Structures & Algorithms"
difficulty: "intermediate"
tags: ["graph", "bfs", "dfs", "dijkstra", "topological-sort", "union-find"]
order: 4
---

# Graphs

A **graph** G = (V, E) consists of vertices (nodes) and edges (connections). Graphs model relationships: social networks, road maps, dependency chains, and state machines.

## Representations

### Adjacency List (preferred for sparse graphs)

```typescript
// Unweighted
const adjList: Map<number, number[]> = new Map();
adjList.set(0, [1, 2]);
adjList.set(1, [0, 3]);

// Weighted
const weightedAdj: Map<number, [number, number][]> = new Map();
weightedAdj.set(0, [[1, 4], [2, 1]]); // [neighbor, weight]
```

### Adjacency Matrix (preferred for dense graphs)

```typescript
// graph[i][j] = weight (0 or Infinity if no edge)
const matrix: number[][] = [
  [0, 4, 1, 0],
  [4, 0, 0, 2],
  [1, 0, 0, 5],
  [0, 2, 5, 0],
];
```

| Representation | Space | Check edge | Iterate neighbors |
|---|---|---|---|
| Adjacency List | O(V + E) | O(degree) | O(degree) |
| Adjacency Matrix | O(V²) | O(1) | O(V) |

## Core Traversals

### BFS — Breadth-First Search

Explores level by level. Finds **shortest path in unweighted graphs**.

```typescript
function bfs(graph: Map<number, number[]>, start: number): number[] {
  const visited = new Set<number>();
  const queue: number[] = [start];
  const order: number[] = [];
  visited.add(start);

  while (queue.length) {
    const node = queue.shift()!;
    order.push(node);
    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return order;
}
```

**Time:** O(V + E) | **Space:** O(V)

### DFS — Depth-First Search

Explores as deep as possible before backtracking. Used for cycle detection, topological sort, connected components.

```typescript
function dfs(graph: Map<number, number[]>, start: number): number[] {
  const visited = new Set<number>();
  const order: number[] = [];

  function explore(node: number): void {
    visited.add(node);
    order.push(node);
    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor)) explore(neighbor);
    }
  }
  explore(start);
  return order;
}
```

**Time:** O(V + E) | **Space:** O(V)

## Shortest Path Algorithms

### Dijkstra's Algorithm (non-negative weights)

```typescript
function dijkstra(
  graph: Map<number, [number, number][]>,
  source: number,
  n: number
): number[] {
  const dist = new Array(n).fill(Infinity);
  dist[source] = 0;
  // Min-heap: [distance, node]
  const pq: [number, number][] = [[0, source]];

  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]); // simple priority queue
    const [d, u] = pq.shift()!;
    if (d > dist[u]) continue;

    for (const [v, w] of graph.get(u) ?? []) {
      const newDist = dist[u] + w;
      if (newDist < dist[v]) {
        dist[v] = newDist;
        pq.push([newDist, v]);
      }
    }
  }
  return dist;
}
```

**Time:** O((V + E) log V) with proper min-heap | **Space:** O(V)

### Bellman-Ford (handles negative weights)

```typescript
function bellmanFord(
  edges: [number, number, number][], // [from, to, weight]
  n: number,
  source: number
): number[] | null {
  const dist = new Array(n).fill(Infinity);
  dist[source] = 0;

  for (let i = 0; i < n - 1; i++) {
    for (const [u, v, w] of edges) {
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
      }
    }
  }

  // Check for negative cycles
  for (const [u, v, w] of edges) {
    if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
      return null; // negative cycle detected
    }
  }
  return dist;
}
```

**Time:** O(V × E) | **Space:** O(V)

## Topological Sort (DAGs only)

Order vertices so that for every directed edge u → v, u comes before v.

```typescript
function topologicalSort(graph: Map<number, number[]>, n: number): number[] {
  const inDegree = new Array(n).fill(0);
  for (const neighbors of graph.values()) {
    for (const v of neighbors) inDegree[v]++;
  }

  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  const order: number[] = [];
  while (queue.length) {
    const u = queue.shift()!;
    order.push(u);
    for (const v of graph.get(u) ?? []) {
      inDegree[v]--;
      if (inDegree[v] === 0) queue.push(v);
    }
  }

  return order.length === n ? order : []; // empty = cycle exists
}
```

## Union-Find (Disjoint Set Union)

Used for connected components, Kruskal's MST, and cycle detection in undirected graphs.

```typescript
class UnionFind {
  parent: number[];
  rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }
    return this.parent[x];
  }

  union(x: number, y: number): boolean {
    const px = this.find(x), py = this.find(y);
    if (px === py) return false; // already connected
    // union by rank
    if (this.rank[px] < this.rank[py]) this.parent[px] = py;
    else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
    else { this.parent[py] = px; this.rank[px]++; }
    return true;
  }

  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }
}
```

**Time:** O(α(n)) ≈ O(1) per operation (inverse Ackermann)

## Algorithm Selection Guide

| Scenario | Algorithm |
|---|---|
| Shortest path, unweighted | BFS |
| Shortest path, non-negative weights | Dijkstra |
| Shortest path, negative weights | Bellman-Ford |
| All-pairs shortest path | Floyd-Warshall O(V³) |
| Minimum Spanning Tree | Kruskal (sparse) / Prim (dense) |
| Task ordering / dependencies | Topological Sort |
| Connected components | Union-Find or DFS |
| Cycle detection (directed) | DFS with coloring |
| Cycle detection (undirected) | Union-Find |
