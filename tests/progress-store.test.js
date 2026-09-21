import test from "node:test";
import assert from "node:assert/strict";
import { ProgressStore, LEGACY_KEY, migrateLegacy, mergeChanges, periodKeys } from "../progress-store.js";

const today = () => new Date(2026, 8, 19, 12);
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
function store(storage = memoryStorage(), options = {}) {
  return new ProgressStore({ storage, projectId: "test-project", now: today, ...options });
}
async function settled(...stores) {
  for (let i = 0; i < 100; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
    if (stores.every((item) => !item.inFlight)) return;
  }
  throw new Error("Sync did not settle");
}
function server() {
  const documents = new Map();
  const listeners = new Map();
  const writes = [];
  let failure = null;
  let beforeCommit = null;
  const backend = (uid) => ({
    watch(id, next) {
      const key = `${uid}/${id}`;
      const callbacks = listeners.get(key) ?? new Set();
      callbacks.add(next);
      listeners.set(key, callbacks);
      queueMicrotask(() => next(documents.get(key) ?? {}));
      return () => callbacks.delete(next);
    },
    async commit(id, { imports, changes }) {
      if (beforeCommit) await beforeCommit();
      if (failure) throw failure;
      const key = `${uid}/${id}`;
      const next = mergeChanges(documents.get(key) ?? {}, imports, changes);
      documents.set(key, next);
      writes.push({ uid, id, changes });
      listeners.get(key)?.forEach((callback) => callback(next));
    }
  });
  return { documents, writes, listeners, backend, fail: (error) => { failure = error; }, delay: (fn) => { beforeCommit = fn; } };
}
function connect(item, remote, uid = "alice") {
  item.setUser(uid);
  item.connect(remote.backend(uid));
}

test("legacy device progress is preserved, sanitized and imported without clearing the source", async () => {
  const legacy = {
    daily: { period: "2026-09-19", completed: ["make-bed", "unknown"] },
    weekly: { period: "2026-09-13", completed: { sunday: ["clear-counters"], monday: "not-an-array" } },
    monthly: { period: "2026-09", completed: { "week-3": ["window-glass"] } }
  };
  const storage = memoryStorage({ [LEGACY_KEY]: JSON.stringify(legacy) });
  const item = store(storage);
  assert.deepEqual(item.completed("daily"), ["make-bed"]);
  assert.deepEqual(migrateLegacy(legacy)["weekly-2026-09-13"], { "sunday:clear-counters": true });
  const remote = server();
  connect(item, remote);
  await settled(item);
  assert.equal(remote.documents.get("alice/daily-2026-09-19")["make-bed"], true);
  assert.equal(remote.documents.get("alice/monthly-2026-09")["week-3:window-glass"], true);
  assert.equal(storage.getItem(LEGACY_KEY), JSON.stringify(legacy));
});

test("an existing cloud reset wins over old device checkmarks", async () => {
  const item = store();
  item.set("daily", "daily", "make-bed", true);
  const remote = server();
  remote.documents.set("alice/daily-2026-09-19", { "make-bed": false, "ten-minute-tidy": true });
  connect(item, remote);
  await settled(item);
  assert.deepEqual(item.completed("daily"), ["ten-minute-tidy"]);
});

test("guest progress survives reload and the correct daily, Sunday and monthly boundaries", () => {
  let date = new Date(2026, 7, 31, 23, 59);
  const storage = memoryStorage();
  const item = store(storage, { now: () => date });
  item.set("daily", "daily", "make-bed", true);
  item.set("weekly", "sunday", "clear-counters", true);
  item.set("monthly", "week-1", "expired-food", true);
  const reload = store(storage, { now: () => date });
  assert.deepEqual(reload.completed("daily"), ["make-bed"]);
  date = new Date(2026, 8, 1, 0, 1);
  assert.deepEqual(reload.completed("daily"), []);
  assert.deepEqual(reload.completed("monthly", "week-1"), []);
  assert.deepEqual(reload.completed("weekly", "sunday"), ["clear-counters"]);
  date = new Date(2026, 8, 6, 0, 1);
  assert.deepEqual(reload.completed("weekly", "sunday"), []);
  assert.equal(periodKeys(date).weekly, "2026-09-06");
});

test("offline changes and explicit resets survive reload and sync after reconnect", async () => {
  const storage = memoryStorage();
  const item = store(storage);
  item.setUser("alice");
  item.setOnline(false);
  item.set("daily", "daily", "make-bed", true);
  item.reset("weekly");
  assert.equal(item.status(), "offline");
  const reload = store(storage);
  assert.equal(reload.owner, "alice");
  assert.deepEqual(reload.completed("daily"), ["make-bed"]);
  const remote = server();
  remote.documents.set("alice/weekly-2026-09-13", { "sunday:clear-counters": true });
  connect(reload, remote);
  await settled(reload);
  assert.equal(remote.documents.get("alice/weekly-2026-09-13")["sunday:clear-counters"], false);
  assert.equal(remote.documents.get("alice/daily-2026-09-19")["make-bed"], true);
  assert.equal(reload.hasPending(), false);
  assert.equal(reload.status(), "synced");
});

test("two devices merge independent clicks and receive each other's progress", async () => {
  const remote = server();
  const phone = store();
  const laptop = store();
  connect(phone, remote);
  connect(laptop, remote);
  await settled(phone, laptop);
  phone.set("daily", "daily", "make-bed", true);
  laptop.set("daily", "daily", "ten-minute-tidy", true);
  await settled(phone, laptop);
  assert.deepEqual(phone.completed("daily").sort(), ["make-bed", "ten-minute-tidy"]);
  assert.deepEqual(laptop.completed("daily").sort(), ["make-bed", "ten-minute-tidy"]);
  phone.set("daily", "daily", "make-bed", false);
  await settled(phone, laptop);
  assert.deepEqual(laptop.completed("daily"), ["ten-minute-tidy"]);
});

test("a late acknowledgement cannot discard a newer click on the same task", async () => {
  const remote = server();
  const item = store();
  connect(item, remote);
  await settled(item);
  let release;
  const pause = new Promise((resolve) => { release = resolve; });
  remote.delay(() => pause);
  item.set("daily", "daily", "make-bed", true);
  item.set("daily", "daily", "make-bed", false);
  assert.equal(item.hasPending(), true);
  release();
  await settled(item);
  assert.equal(remote.writes.length, 2);
  assert.equal(remote.documents.get("alice/daily-2026-09-19")["make-bed"], false);
  assert.equal(item.hasPending(), false);
});

test("failed writes retain the durable outbox until a successful retry", async () => {
  const remote = server();
  const item = store();
  connect(item, remote);
  await settled(item);
  remote.fail({ code: "permission-denied" });
  item.set("daily", "daily", "make-bed", true);
  await settled(item);
  assert.equal(item.status(), "error");
  assert.equal(item.hasPending(), true);
  remote.fail(null);
  item.retry();
  await settled(item);
  assert.equal(item.hasPending(), false);
  assert.equal(item.status(), "synced");
});

test("a newer server value received before acknowledgement is not left masked by an old local edit", async () => {
  const remote = server();
  const item = store();
  item.setUser("alice");
  const backend = remote.backend("alice");
  let release;
  const pause = new Promise((resolve) => { release = resolve; });
  item.connect({ ...backend, async commit(id, payload) {
    await backend.commit(id, payload);
    const next = { "make-bed": false };
    remote.documents.set(`alice/${id}`, next);
    remote.listeners.get(`alice/${id}`).forEach((callback) => callback(next));
    await pause;
  } });
  await settled(item);
  item.set("daily", "daily", "make-bed", true);
  await new Promise((resolve) => setImmediate(resolve));
  release();
  await settled(item);
  assert.deepEqual(item.completed("daily"), []);
});

test("new accounts do not overwrite saved data with empty defaults", async () => {
  const remote = server();
  remote.documents.set("alice/daily-2026-09-19", { "make-bed": true });
  const item = store();
  connect(item, remote);
  await settled(item);
  assert.equal(remote.writes.length, 0);
  assert.deepEqual(item.completed("daily"), ["make-bed"]);
});

test("account switching never exposes the previous account or imports guest data twice", async () => {
  const remote = server();
  const item = store();
  item.set("daily", "daily", "make-bed", true);
  connect(item, remote, "alice");
  await settled(item);
  item.set("daily", "daily", "ten-minute-tidy", true);
  await settled(item);
  item.setUser(null);
  assert.deepEqual(item.completed("daily"), ["make-bed"]); // Original guest checklist, not Alice's private change.
  connect(item, remote, "bob");
  await settled(item);
  assert.deepEqual(item.completed("daily"), []);
  assert.equal(remote.documents.has("bob/daily-2026-09-19"), false);
  connect(item, remote, "alice");
  await settled(item);
  assert.deepEqual(item.completed("daily").sort(), ["make-bed", "ten-minute-tidy"]);
});

test("late callbacks and writes from a previous account cannot mutate the current account", async () => {
  const remote = server();
  const item = store();
  connect(item, remote, "alice");
  await settled(item);
  const staleListener = [...remote.listeners.get("alice/daily-2026-09-19")][0];
  let release;
  const pause = new Promise((resolve) => { release = resolve; });
  remote.delay(() => pause);
  item.set("daily", "daily", "make-bed", true);
  connect(item, remote, "bob");
  item.set("daily", "daily", "ten-minute-tidy", true);
  staleListener({ "make-bed": true });
  release();
  await settled(item);
  assert.equal(item.owner, "bob");
  assert.deepEqual(item.completed("daily"), ["ten-minute-tidy"]);
  assert.deepEqual(remote.documents.get("bob/daily-2026-09-19"), { "ten-minute-tidy": true });
});

test("period rollover reconnects listeners without losing queued previous-period changes", async () => {
  let date = new Date(2026, 8, 19, 23, 59);
  const item = store(memoryStorage(), { now: () => date });
  const remote = server();
  connect(item, remote);
  await settled(item);
  item.setOnline(false);
  item.set("daily", "daily", "make-bed", true);
  date = new Date(2026, 8, 20, 0, 1);
  item.refreshPeriods();
  assert.deepEqual(item.completed("daily"), []);
  item.setOnline(true);
  await settled(item);
  assert.equal(remote.documents.get("alice/daily-2026-09-19")["make-bed"], true);
  assert.deepEqual(item.completed("daily"), []);
  assert.ok(item.watched.includes("daily-2026-09-20"));
});

test("unavailable browser storage keeps the UI usable without claiming durable saves", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); } };
  const item = store(blocked);
  item.set("daily", "daily", "make-bed", true);
  assert.deepEqual(item.completed("daily"), ["make-bed"]);
  assert.equal(item.storageOK, false);
});

test("malformed cached and legacy data cannot crash the checklist", () => {
  const storage = memoryStorage({ [LEGACY_KEY]: '{"daily":{"period":"2026-09-19","completed":4}}', "home-reset-state-v2:guest": "{broken" });
  const item = store(storage);
  assert.deepEqual(item.completed("daily"), []);
  item.set("daily", "daily", "make-bed", true);
  assert.deepEqual(item.completed("daily"), ["make-bed"]);
});
