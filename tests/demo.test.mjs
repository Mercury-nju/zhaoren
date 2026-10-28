import test from "node:test";
import assert from "node:assert/strict";
import { loadConversations, saveConversations, replyTo } from "../src/demo.ts";

const key = "zhaoren.frontend.demo.v1";
const sample = {
  id: "local-demo",
  title: "Example conversation",
  archived: false,
  updatedAt: 1,
  messages: [
    {
      id: "example-message",
      role: "user",
      content: "Example input",
      createdAt: 1,
    },
  ],
};
function memoryStorage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
  };
  return values;
}
test("local conversation roundtrip retains archived state and complete messages", () => {
  memoryStorage();
  assert.equal(saveConversations([{ ...sample, archived: true }]), true);
  assert.deepEqual(loadConversations(), [{ ...sample, archived: true }]);
});
test("malformed stored data is rejected without crashing the interface", () => {
  const values = memoryStorage();
  for (const value of [
    "{",
    "{}",
    "[null]",
    JSON.stringify([{ ...sample, messages: [null] }]),
    JSON.stringify([
      { ...sample, messages: [{ ...sample.messages[0], role: "system" }] },
    ]),
  ]) {
    values.set(key, value);
    assert.deepEqual(loadConversations(), []);
  }
});
test("unavailable browser storage returns an explicit save failure", () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error("Storage unavailable");
    },
    setItem: () => {
      throw new Error("Quota exceeded");
    },
  };
  assert.deepEqual(loadConversations(), []);
  assert.equal(saveConversations([sample]), false);
});
test("demo replies remain local and do not make network requests", () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Network access is forbidden in demo replies");
  };
  try {
    assert.match(replyTo("A new product idea"), /本地演示回复/);
    assert.match(replyTo("你好"), /你好/);
  } finally {
    globalThis.fetch = original;
  }
});
