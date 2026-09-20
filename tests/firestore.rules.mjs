// Optional integration gate; see FIREBASE_SETUP.md for emulator instructions.
import { readFile } from "node:fs/promises";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, setLogLevel } from "firebase/firestore";

let environment;
const projectId = "demo-home-reset";
const payload = () => ({ version: 1, tasks: { "make-bed": true }, updatedAt: serverTimestamp() });
const path = "users/alice/homeReset/daily-2026-09-19";

before(async () => {
  setLogLevel("silent");
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { host: "127.0.0.1", port: 8080, rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8") }
  });
});
after(async () => { await environment?.cleanup(); });

test("the owner can write, load and reset progress", async () => {
  const db = environment.authenticatedContext("alice").firestore();
  await assertSucceeds(setDoc(doc(db, path), payload()));
  await assertSucceeds(getDoc(doc(db, path)));
  await assertSucceeds(setDoc(doc(db, path), { ...payload(), tasks: { "make-bed": false } }));
});

test("signed-out visitors and another account cannot read or write the owner's data", async () => {
  for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext("bob")]) {
    const db = context.firestore();
    await assertFails(getDoc(doc(db, path)));
    await assertFails(setDoc(doc(db, path), payload()));
  }
});

test("malformed documents, extra fields, invalid paths and client timestamps are rejected", async () => {
  const db = environment.authenticatedContext("alice").firestore();
  for (const value of [
    { ...payload(), version: 2 },
    { ...payload(), tasks: [] },
    { ...payload(), extra: true },
    { ...payload(), updatedAt: new Date(2000, 0, 1) },
    { version: 1, tasks: {} },
    { ...payload(), tasks: Object.fromEntries(Array.from({ length: 61 }, (_, i) => [`task${i}`, true])) }
  ]) await assertFails(setDoc(doc(db, path), value));
  await assertFails(setDoc(doc(db, "users/alice/homeReset/unscoped"), payload()));
  await assertFails(setDoc(doc(db, "public/progress"), payload()));
  await assertFails(deleteDoc(doc(db, path)));
});
