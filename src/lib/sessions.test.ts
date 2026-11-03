import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { db } from "./db";
import { SESSION_TTL_MS, createSession, deleteSession, validateSession } from "./sessions";

// Runs against the gastos_test database (see `make test`).
const suffix = randomUUID();
let userId: string;
let roleId: string;
const sessionId = (token: string) => createHash("sha256").update(token).digest("hex");

before(async () => {
  const role = await db.role.create({ data: { name: `test-${suffix}`, permissions: ["dashboard.view"] } });
  const user = await db.user.create({
    data: { fullName: "Test", username: `test-${suffix}`, email: `${suffix}@test.local`, passwordHash: "x", roleId: role.id },
  });
  roleId = role.id;
  userId = user.id;
});

after(async () => {
  await db.user.delete({ where: { id: userId } });
  await db.role.delete({ where: { id: roleId } });
  await db.$disconnect();
});

test("a new session returns its user with the role's permissions", async () => {
  const user = await validateSession(await createSession(userId));
  assert.equal(user?.id, userId);
  assert.deepEqual(user?.permissions, ["dashboard.view"]);
});

test("an unknown token returns null", async () => {
  assert.equal(await validateSession("not-a-real-token"), null);
});

test("an expired session returns null and is deleted", async () => {
  const token = await createSession(userId);
  await db.session.update({ where: { id: sessionId(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal(await validateSession(token), null);
  assert.equal(await db.session.count({ where: { id: sessionId(token) } }), 0);
});

test("activity pushes the expiry forward", async () => {
  const token = await createSession(userId);
  await db.session.update({ where: { id: sessionId(token) }, data: { expiresAt: new Date(Date.now() + 2 * 60 * 1000) } });
  await validateSession(token);
  const { expiresAt } = await db.session.findUniqueOrThrow({ where: { id: sessionId(token) } });
  assert.ok(expiresAt.getTime() > Date.now() + SESSION_TTL_MS - 5000);
});

test("deactivating the user invalidates the session", async () => {
  const token = await createSession(userId);
  await db.user.update({ where: { id: userId }, data: { active: false } });
  assert.equal(await validateSession(token), null);
  await db.user.update({ where: { id: userId }, data: { active: true } });
});

test("logout deletes the session", async () => {
  const token = await createSession(userId);
  await deleteSession(token);
  assert.equal(await validateSession(token), null);
});
