/**
 * Audit des droits existants (scripts/audit-entitlements.sql) : il doit
 * repérer les bons cas, ne rien modifier, et refuser toute écriture.
 * Voir tests/helpers/pg.ts pour l'activation (TEST_DATABASE_URL).
 */
import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pg from "pg";
import { DAY, TEST_DATABASE_URL, createUser, integrationSkip, resetDatabase, selectTestDatabase } from "./helpers/pg";

selectTestDatabase();

const SCRIPT = readFileSync("scripts/audit-entitlements.sql", "utf8");
let db: typeof import("@/lib/db").db;
let client: pg.Client;

before(async () => {
  if (integrationSkip) return;
  db = (await import("@/lib/db")).db;
  client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
});
after(async () => {
  if (integrationSkip) return;
  await client.end();
  await db.$disconnect();
});
beforeEach(async () => {
  if (!integrationSkip) await resetDatabase(db);
});

interface Row {
  case_code: string;
  action: string;
  user_id: string | null;
  detail: string;
}
async function audit(): Promise<Row[]> {
  const results = (await client.query(SCRIPT)) as unknown as pg.QueryResult[];
  const detail = results.find((result) => result.fields?.some((field) => field.name === "case_code"));
  return (detail?.rows ?? []) as Row[];
}
const idsOf = (rows: Row[], code: string) =>
  rows.filter((row) => row.case_code === code && row.user_id).map((row) => row.user_id).sort();

test("le script est en lecture seule : aucune instruction d'écriture", () => {
  const code = SCRIPT.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n").toUpperCase();
  for (const verb of ["INSERT ", "UPDATE ", "DELETE ", "TRUNCATE", "DROP ", "ALTER ", "CREATE ", "GRANT "]) {
    assert.ok(!code.includes(verb), `instruction d'écriture : ${verb.trim()}`);
  }
  assert.match(code, /BEGIN READ ONLY/);
  assert.match(code, /ROLLBACK/);
});

test("repère chaque cas à risque et ne signale pas les comptes sains", { skip: integrationSkip }, async () => {
  const future = (days: number) => new Date(Date.now() + days * DAY);
  await createUser(db, { id: "open-plan", plan: "PREMIUM", planExpiresAt: null });
  await createUser(db, { id: "dated", plan: "STUDENT", planExpiresAt: future(10) });
  await createUser(db, { id: "free", plan: "FREE", planExpiresAt: null });
  await createUser(db, { id: "far", plan: "STUDENT", planExpiresAt: future(900) });
  await createUser(db, { id: "center-no-center", plan: "CENTER", planExpiresAt: future(5) });
  await createUser(db, { id: "paid-nothing", plan: "FREE", planExpiresAt: null });
  await db.payment.create({ data: { userId: "paid-nothing", provider: "STRIPE", providerRef: "p-ok", plan: "STUDENT", amount: 9.9, currency: "EUR", status: "SUCCESS" } });
  await db.payment.create({ data: { userId: "dated", provider: "FLUTTERWAVE", providerRef: "p-pend", plan: "CENTER", seats: 3, amount: 1, currency: "XAF", status: "PENDING" } });

  const centers: [string, string | null, number, string[], string][] = [
    // [propriétaire, échéance (jours, null = sans date), quota, membres, plan]
    ["own-open", null, 10, ["a1"], "CENTER"],
    ["own-expired", "-4", 5, ["b1"], "CENTER"],
    ["own-beyond", "20", 1, ["c1", "c2", "c3"], "CENTER"],
    ["own-zero", "20", 0, ["d1", "d2"], "CENTER"],
    ["own-free", null, 5, ["e1"], "FREE"],
    ["own-healthy", "20", 5, ["f1"], "CENTER"],
  ];
  for (const [owner, expiry, seats, members, plan] of centers) {
    await createUser(db, {
      id: owner,
      plan: plan as "CENTER" | "FREE",
      planExpiresAt: expiry === null ? null : future(Number(expiry)),
      role: "CENTER_ADMIN",
    });
    const center = await db.center.create({ data: { name: owner, ownerId: owner, inviteCode: `inv-${owner}`, seats } });
    for (const id of members) {
      await createUser(db, { id, plan: "FREE", planExpiresAt: null, centerId: center.id, centerJoinedAt: new Date() });
    }
  }
  const snapshot = async () => JSON.stringify([
    await db.user.count(), await db.payment.count(), await db.center.count(), await db.centerSeatGrant.count(),
  ]);
  const before = await snapshot();

  const rows = await audit();

  assert.deepEqual(idsOf(rows, "A1_PERSONAL_PLAN_NO_EXPIRY"), ["open-plan", "own-open"], "plans payants sans date");
  assert.deepEqual(idsOf(rows, "A2_CENTER_OWNER_NO_EXPIRY"), ["own-open"]);
  assert.deepEqual(idsOf(rows, "B1_CENTER_OWNER_EXPIRED"), ["own-expired"]);
  assert.deepEqual(idsOf(rows, "B2_PAID_RECENTLY_NO_ACTIVE_PLAN"), ["paid-nothing"]);
  assert.deepEqual(idsOf(rows, "C1_MEMBERS_BEYOND_QUOTA"), ["own-beyond"]);
  assert.deepEqual(idsOf(rows, "C2_MEMBERS_WITHOUT_QUOTA"), ["own-zero"]);
  assert.deepEqual(idsOf(rows, "C3_CENTER_OWNER_FREE"), ["own-free"]);
  assert.deepEqual(idsOf(rows, "C4_CENTER_PLAN_WITHOUT_CENTER"), ["center-no-center"]);
  assert.deepEqual(idsOf(rows, "D1_FAR_FUTURE_EXPIRY"), ["far"]);
  assert.deepEqual(idsOf(rows, "E1_PENDING_PAYMENTS"), ["dated"]);

  const flagged = new Set(rows.filter((row) => row.user_id).map((row) => row.user_id));
  for (const healthy of ["dated", "free", "own-healthy"]) {
    if (healthy === "dated") continue; // « dated » n'apparaît que pour son paiement en attente (E1)
    assert.ok(!flagged.has(healthy), `${healthy} ne doit pas être signalé`);
  }
  const totals = rows.filter((row) => !row.user_id);
  assert.ok(totals.length >= 8 && totals.every((row) => /\d+ cas/.test(row.detail)), "une ligne de total par groupe");
  assert.equal(await snapshot(), before, "l'audit n'a rien modifié");
});

test("une écriture tentée dans la transaction de l'audit est refusée par PostgreSQL", { skip: integrationSkip }, async () => {
  await client.query("BEGIN READ ONLY");
  await assert.rejects(client.query(`UPDATE "User" SET credits = 0`), /read-only transaction/);
  await client.query("ROLLBACK");
});
