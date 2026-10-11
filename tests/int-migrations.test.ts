/**
 * Migrations de sécurité : on rejoue l'historique sur une base TEMPORAIRE
 * (créée puis supprimée par le test), on y met des données « d'avant », on
 * applique la migration, on vérifie, puis on exécute le retour arrière.
 *
 * Preuves visées : rien n'est perdu ni modifié, la reprise des chemins audio
 * suit exactement la même règle que le code TypeScript, et le retour arrière
 * restitue des URL utilisables par l'ancien code.
 * Voir tests/helpers/pg.ts pour l'activation (TEST_DATABASE_URL).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { audioPathFromPublicUrl } from "@/lib/audio-path";
import { TEST_DATABASE_URL, integrationSkip } from "./helpers/pg";

const MIGRATIONS = path.join(process.cwd(), "prisma", "migrations");
const AUDIO_MIGRATION = "20261012090000_private_audio";
const SUPABASE_URL = "https://projet.supabase.co";
const hasPsql = spawnSync("psql", ["--version"]).status === 0;
const SECURITY_MIGRATION = "20261011120000_security_hardening";

function sql(file: string): string {
  return readFileSync(path.join(MIGRATIONS, file), "utf8");
}
const migrationDirs = () =>
  readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

/**
 * Base TEMPORAIRE (créée puis supprimée) où l'historique est rejoué jusqu'à
 * la migration `before` EXCLUE. Jamais la base de test elle-même.
 */
async function withScratch(
  before: string,
  fn: (client: pg.Client, url: string) => Promise<void>,
): Promise<void> {
  const name = `telc_mig_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  const url = new URL(TEST_DATABASE_URL);
  url.pathname = `/${name}`;
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  try {
    for (const dir of migrationDirs()) {
      if (dir >= before) continue;
      await client.query(sql(`${dir}/migration.sql`));
    }
    await fn(client, url.toString());
  } finally {
    await client.end();
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.end();
  }
}

/** URL d'audio avant migration → chemin attendu (null = non repris). */
const LEGACY_AUDIO: [string, string | null, string | null][] = [
  ["p-public", `${SUPABASE_URL}/storage/v1/object/public/audio/1760000000-piste.mp3`, "1760000000-piste.mp3"],
  ["p-query", `${SUPABASE_URL}/storage/v1/object/public/audio/seed-1-hoeren-teil-1.mp3?t=2026`, "seed-1-hoeren-teil-1.mp3"],
  ["p-folder", `${SUPABASE_URL}/storage/v1/object/public/audio/dossier/x.mp3`, null],
  ["p-other-bucket", `${SUPABASE_URL}/storage/v1/object/public/autre/x.mp3`, null],
  ["p-static", "/audio/demo/hoeren-teil-1.wav", null],
  ["p-external", "https://cdn.example/x.mp3", null],
  ["p-none", null, null],
];

test("migration audio : avant → après → retour arrière → de nouveau en avant", { skip: integrationSkip }, () =>
  withScratch(AUDIO_MIGRATION, async (scratch, scratchUrl) => {
  // 1. État « d'avant » : toutes les migrations antérieures.
  await scratch.query(`
    INSERT INTO "Exam"(id, title, level, "isPublished", "createdAt", "updatedAt")
    VALUES ('e1', 'Test', 'B2', true, now(), now());
    INSERT INTO "User"(id, email, name, "createdAt", "updatedAt")
    VALUES ('u1', 'u1@x', 'U', now(), now());
    INSERT INTO "ExamSession"(id, "userId", "examId", status, "createdAt")
    VALUES ('s1', 'u1', 'e1', 'IN_PROGRESS', now());
  `);
  for (const [id, audioUrl] of LEGACY_AUDIO) {
    await scratch.query(
      `INSERT INTO "ExamPart"(id, "examId", "sectionId", "partId", "audioUrl") VALUES ($1, 'e1', 'hoeren', $1, $2)`,
      [id, audioUrl],
    );
  }
  const before = await scratch.query(`SELECT id, "audioUrl" FROM "ExamPart" ORDER BY id`);

  // 2. Migration en avant.
  await scratch.query(sql(`${AUDIO_MIGRATION}/migration.sql`));

  const after = await scratch.query(`SELECT id, "audioUrl", "audioPath" FROM "ExamPart" ORDER BY id`);
  assert.equal(after.rowCount, before.rowCount, "aucune ligne perdue");
  for (const [index, row] of after.rows.entries()) {
    assert.equal(row.audioUrl, before.rows[index].audioUrl, `audioUrl de ${row.id} intact`);
    const expected = LEGACY_AUDIO.find(([id]) => id === row.id)![2];
    assert.equal(row.audioPath, expected, `audioPath de ${row.id}`);
    // Parité exacte avec la règle TypeScript utilisée à l'exécution.
    assert.equal(row.audioPath, audioPathFromPublicUrl(row.audioUrl), `parité SQL/TS pour ${row.id}`);
  }
  const session = await scratch.query(`SELECT status, "audioIssued" FROM "ExamSession" WHERE id = 's1'`);
  assert.equal(session.rows[0].status, "IN_PROGRESS", "session existante intacte");
  assert.deepEqual(session.rows[0].audioIssued, {});

  // 3. Données créées APRÈS la migration : chemin seul, sans URL.
  await scratch.query(
    `INSERT INTO "ExamPart"(id, "examId", "sectionId", "partId", "audioPath") VALUES ('p-new', 'e1', 'hoeren', 'p-new', 'nouveau.mp3')`,
  );

  // 4. Retour arrière (psql, comme en procédure réelle).
  if (!hasPsql) {
    console.warn("psql absent : retour arrière non exécuté");
    return;
  }
  const down = spawnSync(
    "psql",
    [scratchUrl, "-v", "ON_ERROR_STOP=1", "-v", `supabase_url=${SUPABASE_URL}`, "-f", path.join(MIGRATIONS, AUDIO_MIGRATION, "down.sql")],
    { encoding: "utf8" },
  );
  assert.equal(down.status, 0, down.stderr);

  const columns = await scratch.query(
    `SELECT column_name FROM information_schema.columns
     WHERE (table_name = 'ExamPart' AND column_name = 'audioPath')
        OR (table_name = 'ExamSession' AND column_name = 'audioIssued')`,
  );
  assert.equal(columns.rowCount, 0, "colonnes ajoutées supprimées");

  const restored = await scratch.query(`SELECT id, "audioUrl" FROM "ExamPart" ORDER BY id`);
  assert.equal(restored.rowCount, before.rowCount! + 1, "aucune ligne supprimée");
  for (const row of before.rows) {
    assert.equal(
      restored.rows.find((r) => r.id === row.id)!.audioUrl,
      row.audioUrl,
      `audioUrl d'origine de ${row.id} restitué à l'identique`,
    );
  }
  assert.equal(
    restored.rows.find((r) => r.id === "p-new")!.audioUrl,
    `${SUPABASE_URL}/storage/v1/object/public/audio/nouveau.mp3`,
    "l'audio rattaché après la migration retrouve une URL pour l'ancien code",
  );
  assert.equal((await scratch.query(`SELECT 1 FROM "ExamSession" WHERE id = 's1'`)).rowCount, 1);

  // 5. Rejouable : on peut de nouveau avancer après un retour arrière.
  await scratch.query(sql(`${AUDIO_MIGRATION}/migration.sql`));
  const again = await scratch.query(`SELECT "audioPath" FROM "ExamPart" WHERE id = 'p-public'`);
  assert.equal(again.rows[0].audioPath, "1760000000-piste.mp3");
  }),
);

/**
 * Migration du sprint précédent (sièges datés, preuve d'e-mail) rejouée sur
 * des données « d'avant » : centres au compteur cumulatif, comptes Google et
 * à mot de passe, membres.
 */
test("migration sécurité : sièges repris en dotations, comptes et paiements intacts", { skip: integrationSkip }, () =>
  withScratch(SECURITY_MIGRATION, async (db) => {
    await db.query(`
      INSERT INTO "User"(id, email, "passwordHash", name, "emailVerified", plan, "planExpiresAt", "createdAt", "updatedAt") VALUES
        ('owner',  'o@x',  'h',  'O',  now(), 'CENTER', now() + interval '12 days', now() - interval '90 days', now()),
        ('owner2', 'o2@x', 'h',  'O2', now(), 'CENTER', NULL, now(), now()),
        ('owner3', 'o3@x', 'h',  'O3', now(), 'CENTER', now() + interval '5 days', now(), now()),
        ('owner4', 'o4@x', 'h',  'O4', now(), 'FREE',   NULL, now(), now()),
        ('owner5', 'o5@x', 'h',  'O5', now(), 'CENTER', now() + interval '9 days', now(), now()),
        ('goog',   'g@x',  NULL, 'G',  now(), 'FREE',   NULL, now(), now()),
        ('pw',     'pw@x', 'h',  'PW', now(), 'FREE',   NULL, now(), now()),
        ('pw2',    'pw2@x','h',  'PW2', NULL, 'FREE',   NULL, now(), now());
      INSERT INTO "Center"(id, name, "ownerId", "inviteCode", seats) VALUES
        ('c1', 'C1', 'owner',  'inv1', 100),
        ('c2', 'C2', 'owner2', 'inv2', 7),
        ('c3', 'C3', 'owner3', 'inv3', 0),
        ('c4', 'C4', 'owner4', 'inv4', 5),
        ('c5', 'C5', 'owner5', 'inv5', 0);
      INSERT INTO "User"(id, email, "passwordHash", name, "centerId", "createdAt", "updatedAt")
        VALUES ('m1', 'm1@x', 'h', 'M', 'c1', now() - interval '5 days', now()),
               ('m5a', 'm5a@x', 'h', 'M5a', 'c5', now() - interval '4 days', now()),
               ('m5b', 'm5b@x', 'h', 'M5b', 'c5', now() - interval '3 days', now());
      INSERT INTO "Payment"(id, "userId", provider, "providerRef", plan, amount, currency, status, "updatedAt")
        VALUES ('pay1', 'owner', 'STRIPE', 'ref-1', 'CENTER', 250000, 'XAF', 'SUCCESS', now());
    `);
    const users = (await db.query(`SELECT count(*)::int AS n FROM "User"`)).rows[0].n;

    await db.query(sql(`${SECURITY_MIGRATION}/migration.sql`));

    // Sièges : l'ancien droit d'accès est reproduit à l'identique.
    const grants = await db.query(
      `SELECT "centerId", seats,
              CASE WHEN extract(year FROM "expiresAt") >= 2099 THEN -1
                   ELSE round(extract(epoch FROM ("expiresAt" - now())) / 86400)::int END AS days
       FROM "CenterSeatGrant" ORDER BY "centerId"`,
    );
    assert.deepEqual(
      grants.rows.map((row) => [row.centerId, row.seats, row.days]),
      [
        ["c1", 100, 12], // jusqu'à la fin de l'abonnement payé
        ["c2", 7, -1], //   propriétaire SANS date : sièges SANS échéance (jamais 30 jours)
        ["c5", 2, 9], //    quota 0 mais 2 membres : ils gardent l'accès (comme avant)
      ],
      "c3 (quota 0, aucun membre) et c4 (propriétaire FREE : aucun droit avant) n'ont aucune dotation",
    );
    assert.equal(
      (await db.query(`SELECT seats FROM "Center" WHERE id = 'c1'`)).rows[0].seats,
      100,
      "ancien compteur conservé (historique)",
    );

    // Preuve d'e-mail : seuls les comptes Google sont repris ; les comptes à
    // mot de passe restent à prouver, sans aucune autre modification.
    const proofs = await db.query(`SELECT id, "emailVerifiedBy", "emailVerified" IS NOT NULL AS ev FROM "User" ORDER BY id`);
    const by = Object.fromEntries(proofs.rows.map((row) => [row.id, row.emailVerifiedBy]));
    assert.equal(by.goog, "GOOGLE");
    for (const id of ["owner", "pw", "pw2", "m1"]) assert.equal(by[id], null, id);
    assert.equal(proofs.rows.find((row) => row.id === "pw")!.ev, true, "emailVerified d'origine intact");
    assert.equal(proofs.rows.find((row) => row.id === "pw2")!.ev, false);

    // Membres : l'ordre d'adhésion repart de la création du compte.
    const member = await db.query(`SELECT "centerJoinedAt" = "createdAt" AS same FROM "User" WHERE id = 'm1'`);
    assert.equal(member.rows[0].same, true);
    assert.equal((await db.query(`SELECT "centerJoinedAt" FROM "User" WHERE id = 'owner'`)).rows[0].centerJoinedAt, null);

    // Rien n'est perdu.
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM "User"`)).rows[0].n, users);
    const payment = await db.query(`SELECT status, amount FROM "Payment" WHERE id = 'pay1'`);
    assert.deepEqual(payment.rows[0], { status: "SUCCESS", amount: 250000 });
  }),
);

const COMMERCIAL_MIGRATION = "20261013090000_commercial_rules";

/**
 * Règles commerciales : migration purement additive. Les paiements en attente
 * gardent centerMode NULL (= ancien traitement à l'activation) et les sessions
 * déjà débitées restent remboursables à l'identique ; le retour arrière ne
 * retire que ce qui a été ajouté.
 */
test("migration règles commerciales : additive, paiements en attente préservés, retour arrière", { skip: integrationSkip }, () =>
  withScratch(COMMERCIAL_MIGRATION, async (db, url) => {
    await db.query(`
      INSERT INTO "User"(id, email, name, credits, "createdAt", "updatedAt") VALUES ('u1', 'u1@x', 'U', 3, now(), now());
      INSERT INTO "Exam"(id, title, level, "createdAt", "updatedAt") VALUES ('e1', 'T', 'B2', now(), now());
      INSERT INTO "ExamSession"(id, "userId", "examId", status, "creditStatus", "createdAt")
        VALUES ('s1', 'u1', 'e1', 'SCORED', 'CHARGED', now());
      INSERT INTO "Payment"(id, "userId", provider, "providerRef", plan, seats, amount, currency, status, "updatedAt")
        VALUES ('p1', 'u1', 'STRIPE', 'ref-pending', 'CENTER', 5, 20, 'EUR', 'PENDING', now()),
               ('p2', 'u1', 'STRIPE', 'ref-done', 'STUDENT', NULL, 9.9, 'EUR', 'SUCCESS', now());
    `);

    await db.query(sql(`${COMMERCIAL_MIGRATION}/migration.sql`));

    const payments = await db.query(`SELECT "providerRef", status, "centerMode", "periodDays", seats FROM "Payment" ORDER BY id`);
    assert.deepEqual(payments.rows, [
      { providerRef: "ref-pending", status: "PENDING", centerMode: null, periodDays: null, seats: 5 },
      { providerRef: "ref-done", status: "SUCCESS", centerMode: null, periodDays: null, seats: null },
    ]);
    const session = await db.query(`SELECT status, "creditStatus", "creditAccountId" FROM "ExamSession" WHERE id = 's1'`);
    assert.deepEqual(session.rows[0], { status: "SCORED", creditStatus: "CHARGED", creditAccountId: null });
    assert.equal((await db.query(`SELECT credits FROM "User" WHERE id = 'u1'`)).rows[0].credits, 3, "aucun solde modifié");

    // Journal : un seul remboursement par session (clé unique).
    await db.query(`INSERT INTO "CreditAdjustment"(id, "sessionId", "accountId", amount, reason, "adminId") VALUES ('a1', 's1', 'u1', 1, 'test', 'admin')`);
    await assert.rejects(
      db.query(`INSERT INTO "CreditAdjustment"(id, "sessionId", "accountId", amount, reason, "adminId") VALUES ('a2', 's1', 'u1', 1, 'doublon', 'admin')`),
      /duplicate key/,
    );

    if (!hasPsql) return;
    const down = spawnSync(
      "psql",
      [url, "-v", "ON_ERROR_STOP=1", "-f", path.join(MIGRATIONS, COMMERCIAL_MIGRATION, "down.sql")],
      { encoding: "utf8" },
    );
    assert.equal(down.status, 0, down.stderr);
    const remaining = await db.query(`SELECT "providerRef", status FROM "Payment" ORDER BY id`);
    assert.equal(remaining.rowCount, 2, "aucun paiement supprimé");
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM "ExamSession"`)).rows[0].n, 1);
    const tables = await db.query(`SELECT to_regclass('"CreditAdjustment"') AS t`);
    assert.equal(tables.rows[0].t, null, "journal supprimé par le retour arrière (exporter avant si nécessaire)");
  }),
);

const DEFERRED_MIGRATION = "20261014090000_deferred_seat_credits";

/**
 * Crédits de renouvellement versés au début de la période : les dotations
 * d'avant ont déjà été créditées au paiement (ancienne règle) et ne doivent
 * jamais l'être une seconde fois ; le retour arrière ne doit pas perdre les
 * crédits d'un renouvellement payé d'avance mais pas encore versé.
 */
test("migration crédits différés : dotations existantes déjà créditées, retour arrière sans perte", { skip: integrationSkip }, () =>
  withScratch(DEFERRED_MIGRATION, async (db, url) => {
    await db.query(`
      INSERT INTO "User"(id, email, name, credits, plan, "createdAt", "updatedAt")
        VALUES ('owner', 'o@x', 'O', 40, 'CENTER', now(), now());
      INSERT INTO "Center"(id, name, "ownerId", "inviteCode") VALUES ('c1', 'C', 'owner', 'inv');
      INSERT INTO "CenterSeatGrant"(id, "centerId", seats, "startsAt", "expiresAt", "createdAt")
        VALUES ('g-old', 'c1', 10, now() - interval '5 days', now() + interval '25 days', now() - interval '5 days');
    `);

    await db.query(sql(`${DEFERRED_MIGRATION}/migration.sql`));

    const old = await db.query(`SELECT credits, "creditedAt" = "createdAt" AS credited FROM "CenterSeatGrant" WHERE id = 'g-old'`);
    assert.deepEqual(old.rows[0], { credits: 0, credited: true }, "ancienne dotation : jamais recréditée");
    assert.equal((await db.query(`SELECT credits FROM "User" WHERE id = 'owner'`)).rows[0].credits, 40);

    // Un renouvellement payé d'avance après la migration : crédits en attente.
    await db.query(`
      INSERT INTO "CenterSeatGrant"(id, "centerId", seats, "startsAt", "expiresAt", credits)
        VALUES ('g-renew', 'c1', 20, now() + interval '25 days', now() + interval '55 days', 300);
    `);

    if (!hasPsql) return;
    const down = spawnSync(
      "psql",
      [url, "-v", "ON_ERROR_STOP=1", "-f", path.join(MIGRATIONS, DEFERRED_MIGRATION, "down.sql")],
      { encoding: "utf8" },
    );
    assert.equal(down.status, 0, down.stderr);
    assert.equal(
      (await db.query(`SELECT credits FROM "User" WHERE id = 'owner'`)).rows[0].credits,
      340,
      "les 300 crédits en attente sont versés avant la suppression des colonnes",
    );
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM "CenterSeatGrant"`)).rows[0].n, 2, "aucune dotation supprimée");
    const columns = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'CenterSeatGrant' AND column_name IN ('credits', 'creditedAt')`,
    );
    assert.equal(columns.rowCount, 0);
  }),
);
