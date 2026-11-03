import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "./password";

test("a hashed password verifies, a wrong one does not", async () => {
  const stored = await hashPassword("correct horse battery");
  assert.equal(await verifyPassword("correct horse battery", stored), true);
  assert.equal(await verifyPassword("correct horse batterY", stored), false);
});

test("the same password hashes differently each time (random salt)", async () => {
  assert.notEqual(await hashPassword("same-password-123"), await hashPassword("same-password-123"));
});

test("a value that is not a scrypt hash never verifies", async () => {
  assert.equal(await verifyPassword("anything", "plaintext"), false);
});
