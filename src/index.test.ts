import { test, expect } from "vitest";
import { CachingProxy } from "./index.js";

test("caching", async () => {
  let count = 0;

  const proxy = new CachingProxy<{ name: string }, string>({
    fetchItem(key) {
      count++;
      return `Hello, ${key.name}`;
    },
  });

  expect(await proxy.get({ name: "Nikita" })).toBe(`Hello, Nikita`);
  expect(count).toBe(1);
  expect(await proxy.get({ name: "Nikita" })).toBe(`Hello, Nikita`);
  expect(count).toBe(1);
});

test("deletion", async () => {
  const proxy = new CachingProxy<{ name: string }, string | null>({
    fetchItem: (key) => null,
  });

  proxy.set({ name: "Ivan" }, "Ivan");
  proxy.set({ name: "Peter" }, "Peter");

  expect(await proxy.get({ name: "Ivan" })).toBe("Ivan");
  expect(await proxy.get({ name: "Peter" })).toBe("Peter");

  proxy.del({ name: "Ivan" });
  expect(await proxy.get({ name: "Ivan" })).toBe(null);
});

test("maxCount deletion", async () => {
  const proxy = new CachingProxy<{ name: string }, string | null>({
    maxCount: 2,
    fetchItem: (key) => null,
  });

  proxy.set({ name: "Ivan" }, "Ivan");
  proxy.set({ name: "Peter" }, "Peter");
  proxy.set({ name: "Nikita" }, "Nikita");

  expect(await proxy.has({ name: "Ivan" })).toBe(false);
  expect(await proxy.has({ name: "Peter" })).toBe(true);
  expect(await proxy.has({ name: "Nikita" })).toBe(true);

  expect(await proxy.get({ name: "Peter" })).toBe("Peter");
  // fetchItem returns 'null' for Ivan
  // this pushes Peter out of cache
  expect(await proxy.get({ name: "Ivan" })).toBe(null);
  // fetchItem returns 'null' for Peter
  expect(await proxy.get({ name: "Peter" })).toBe(null);
});

test("unused time", async () => {
  const proxy = new CachingProxy<{ name: string }, string | null>({
    unusedTime: 99,
    fetchItem: (key) => null,
  });

  const KEY = { name: "Ivan" };
  proxy.set(KEY, "Ivan");
  expect(proxy.has(KEY)).toBe(true);
  await sleep(50);
  expect(proxy.has(KEY)).toBe(true);
  await proxy.get(KEY);
  await sleep(50);
  expect(proxy.has(KEY)).toBe(true);
  await sleep(50);
  expect(proxy.has(KEY)).toBe(false);
});

test("stale time", async () => {
  const proxy = new CachingProxy<{ name: string }, string | null>({
    staleTime: 99,
    fetchItem: (key) => null,
  });

  const KEY = { name: "Ivan" };
  proxy.set(KEY, "Ivan");
  expect(proxy.has(KEY)).toBe(true);
  await sleep(50);
  expect(proxy.has(KEY)).toBe(true);
  await proxy.get(KEY);
  await sleep(50);
  expect(proxy.has(KEY)).toBe(false);
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
