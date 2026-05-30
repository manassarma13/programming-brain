---
title: "Memory Management"
category: "Operating Systems"
difficulty: "advanced"
tags: ["paging", "virtual-memory", "segmentation", "page-replacement", "TLB"]
order: 3
---

# Memory Management

## Memory Hierarchy

```
┌─────────────┐  Fastest, smallest, most expensive
│  Registers   │  ~0.3 ns, ~KB
├─────────────┤
│  L1 Cache    │  ~1 ns, ~64 KB
├─────────────┤
│  L2 Cache    │  ~4 ns, ~256 KB
├─────────────┤
│  L3 Cache    │  ~12 ns, ~8 MB
├─────────────┤
│  Main Memory │  ~100 ns, ~16-64 GB
│  (DRAM)      │
├─────────────┤
│  SSD         │  ~100 μs, ~1 TB
├─────────────┤
│  HDD         │  ~10 ms, ~4 TB
└─────────────┘  Slowest, largest, cheapest
```

## Virtual Memory

Virtual memory gives each process the illusion of its own private, contiguous address space, even though physical memory is shared and fragmented.

### Key Benefits

1. **Isolation** — Processes can't access each other's memory
2. **Abstraction** — Programs don't need to know physical addresses
3. **Overcommit** — Total virtual memory can exceed physical RAM (using disk swap)
4. **Sharing** — Libraries can be mapped into multiple processes (shared pages)

### Address Translation

```
Virtual Address → [MMU + Page Table] → Physical Address

┌──────────────────┬───────────┐
│  Virtual Page #   │  Offset   │
└──────────────────┴───────────┘
         │
         ▼
   ┌──────────┐
   │Page Table │
   │  Entry    │ → Frame # (physical)
   └──────────┘
         │
         ▼
┌──────────────────┬───────────┐
│  Physical Frame # │  Offset   │
└──────────────────┴───────────┘
```

## Paging

The OS divides virtual and physical memory into fixed-size **pages** (typically 4 KB).

### Page Table Entry (PTE)

| Field | Purpose |
|---|---|
| Frame number | Physical frame address |
| Present/Valid bit | Is page in physical memory? |
| Dirty bit | Has page been modified? |
| Referenced bit | Has page been accessed recently? |
| Protection bits | Read/Write/Execute permissions |

### Multi-Level Page Tables

Problem: A flat page table for 64-bit addresses would be enormous.

Solution: Hierarchical page tables — only allocate entries for used address ranges.

```
4-Level Page Table (x86-64):
Virtual Address (48 bits used):
┌─────┬─────┬─────┬─────┬────────────┐
│PML4 │ PDP │ PD  │ PT  │   Offset   │
│9 bit│9 bit│9 bit│9 bit│  12 bits   │
└──┬──┴──┬──┴──┬──┴──┬──┴────────────┘
   │     │     │     │
   ▼     ▼     ▼     ▼
  L4 →  L3 →  L2 →  L1 → Physical Frame
```

### TLB (Translation Lookaside Buffer)

A hardware cache for recent virtual-to-physical translations.

| Aspect | Detail |
|---|---|
| Hit time | ~1 ns |
| Miss penalty | ~10-100 ns (page table walk) |
| Typical size | 64–1024 entries |
| Hit rate | >99% for most workloads |

**TLB Flush:** On context switch between processes, the TLB may be flushed (expensive). Tagged TLBs (ASID) avoid full flushes.

## Page Replacement Algorithms

When physical memory is full and a new page is needed, one must be evicted.

| Algorithm | Description | Optimal? | Practical? |
|---|---|---|---|
| **OPT** | Replace page not used for longest future time | Yes | No (requires future knowledge) |
| **FIFO** | Replace oldest page | No | Simple but Belady's anomaly |
| **LRU** | Replace least recently used | Near-optimal | Expensive to track perfectly |
| **Clock (Second Chance)** | Circular FIFO with reference bits | Good | Practical LRU approximation |
| **LFU** | Replace least frequently used | Good for some workloads | Doesn't adapt to changes |

### Clock Algorithm (Second Chance)

```
Pages in circular buffer with reference bit:
┌─R1──R1──R0──R1──R0──R1─┐
│  A    B    C    D    E    F  │  ← circular
└─────────────────────────┘
         ↑ clock hand

On page fault:
1. Check page at clock hand
2. If reference bit = 1: set to 0, advance hand
3. If reference bit = 0: EVICT this page, load new page here
4. Repeat until victim found
```

## Segmentation

Divides memory into **variable-sized segments** based on logical divisions (code, stack, heap, data).

| Aspect | Paging | Segmentation |
|---|---|---|
| Unit size | Fixed (4KB) | Variable |
| Fragmentation | Internal (wasted space in page) | External (gaps between segments) |
| View | Physical division | Logical division |
| Modern use | Primary mechanism | Minimal (x86-64 uses flat segments) |

## Practical: malloc and Memory Allocation

```
Process Memory Layout (Linux):
┌──────────────────┐ High addresses
│     Stack ↓      │ Local vars, return addresses
├──────────────────┤
│                  │
│   (free space)   │
│                  │
├──────────────────┤
│     Heap ↑       │ malloc/new allocations
├──────────────────┤
│   BSS Segment    │ Uninitialized globals (zeroed)
├──────────────────┤
│   Data Segment   │ Initialized globals
├──────────────────┤
│   Text Segment   │ Machine code (read-only)
└──────────────────┘ Low addresses
```

### Allocator Strategies

| Strategy | How | Trade-off |
|---|---|---|
| First Fit | Scan from start, use first block that fits | Fast, but external fragmentation |
| Best Fit | Find smallest block that fits | Less waste, slower |
| Worst Fit | Find largest block | Leaves large holes (bad in practice) |
| Buddy System | Split/merge power-of-2 blocks | Fast coalescing, internal fragmentation |
| Slab Allocator | Pre-allocate objects of same size | Excellent for kernel objects |

## Key Takeaways

- **Virtual memory** provides isolation, abstraction, and overcommit — foundational to modern OSes
- **Paging** with multi-level page tables is the standard — TLB makes it fast
- **Page replacement** matters under memory pressure — LRU approximations (Clock) are standard
- **Stack vs Heap**: Stack is LIFO, fast, auto-managed. Heap is flexible, manual/GC-managed, fragmentation-prone
