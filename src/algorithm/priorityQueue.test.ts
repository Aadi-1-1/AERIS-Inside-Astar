import { describe, expect, it } from "vitest";
import { PriorityQueue } from "./priorityQueue";

interface Item {
  id: string;
  priority: number;
}

const makeQueue = () =>
  new PriorityQueue<Item, string>(
    (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
    (item) => item.id,
  );

describe("PriorityQueue", () => {
  it("pops items in priority order", () => {
    const q = makeQueue();
    [5, 1, 4, 2, 3].forEach((p) => q.push({ id: `n${p}`, priority: p }));
    const order: number[] = [];
    while (!q.isEmpty()) order.push(q.pop()!.priority);
    expect(order).toEqual([1, 2, 3, 4, 5]);
  });

  it("re-positions an item after its priority decreases (decrease-key)", () => {
    const q = makeQueue();
    const items = [10, 20, 30, 40].map((p) => ({ id: `n${p}`, priority: p }));
    items.forEach((i) => q.push(i));
    items[3]!.priority = 5;
    q.update("n40");
    expect(q.pop()!.id).toBe("n40");
    expect(q.size).toBe(3);
  });

  it("reports sorted contents without mutating the queue", () => {
    const q = makeQueue();
    [3, 1, 2].forEach((p) => q.push({ id: `n${p}`, priority: p }));
    expect(q.toSortedArray().map((i) => i.priority)).toEqual([1, 2, 3]);
    expect(q.size).toBe(3);
  });

  it("rejects duplicate keys so stale entries can never exist", () => {
    const q = makeQueue();
    q.push({ id: "a", priority: 1 });
    expect(() => q.push({ id: "a", priority: 0 })).toThrow();
    expect(q.has("a")).toBe(true);
    q.pop();
    expect(q.has("a")).toBe(false);
  });
});
