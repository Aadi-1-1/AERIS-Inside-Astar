/**
 * Binary min-heap keyed by a caller-supplied comparator, with keyed lookup so
 * an item's priority can be updated in place after its fields change
 * (A* "decrease-key"). No stale duplicate entries are ever stored.
 */
export class PriorityQueue<T, K = string | number> {
  private readonly heap: T[] = [];
  private readonly positions = new Map<K, number>();

  constructor(
    /** Negative when `a` should be dequeued before `b`. Must be a strict total order for determinism. */
    private readonly compare: (a: T, b: T) => number,
    private readonly keyOf: (item: T) => K,
  ) {}

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  has(key: K): boolean {
    return this.positions.has(key);
  }

  push(item: T): void {
    const key = this.keyOf(item);
    if (this.positions.has(key)) {
      throw new Error(`PriorityQueue already contains key ${String(key)}; use update() instead.`);
    }
    this.heap.push(item);
    this.positions.set(key, this.heap.length - 1);
    this.siftUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0]!;
    const last = this.heap.pop()!;
    this.positions.delete(this.keyOf(top));
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.positions.set(this.keyOf(last), 0);
      this.siftDown(0);
    }
    return top;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  /** Restores heap order after the priority of the item with `key` changed. */
  update(key: K): void {
    const index = this.positions.get(key);
    if (index === undefined) {
      throw new Error(`PriorityQueue does not contain key ${String(key)}.`);
    }
    this.siftUp(index);
    this.siftDown(this.positions.get(key)!);
  }

  /** All items in dequeue order. Does not modify the queue. */
  toSortedArray(): T[] {
    return [...this.heap].sort(this.compare);
  }

  private siftUp(index: number): void {
    let i = index;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.heap[i]!, this.heap[parent]!) >= 0) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  private siftDown(index: number): void {
    let i = index;
    const n = this.heap.length;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < n && this.compare(this.heap[left]!, this.heap[smallest]!) < 0) smallest = left;
      if (right < n && this.compare(this.heap[right]!, this.heap[smallest]!) < 0) smallest = right;
      if (smallest === i) return;
      this.swap(i, smallest);
      i = smallest;
    }
  }

  private swap(i: number, j: number): void {
    const a = this.heap[i]!;
    const b = this.heap[j]!;
    this.heap[i] = b;
    this.heap[j] = a;
    this.positions.set(this.keyOf(b), i);
    this.positions.set(this.keyOf(a), j);
  }
}
