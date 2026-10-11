/**
 * Idempotence de l'activation de paiement (lib/billing.ts).
 *
 * Exécution :
 *   TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx \
 *     --experimental-test-module-mocks --test tests/*.test.ts
 *
 * MODÈLE DU DOUBLE DE BASE — c'est le cœur de la valeur de ces tests :
 *  - `$transaction` N'EST PAS sérialisé : les deux appels concurrents
 *    s'entrelacent librement. C'est précisément le danger que courait
 *    l'ancienne implémentation (findUnique → test applicatif → écriture).
 *  - `payment.updateMany` EST atomique : aucune césure `await` entre la
 *    lecture du statut et son écriture. C'est la seule garantie que
 *    PostgreSQL nous donne réellement (UPDATE conditionnel sous verrou de
 *    ligne), et donc la seule sur laquelle le correctif s'appuie.
 *
 * Le dernier test est un CANARI : il rejoue l'ancien schéma read-then-write
 * sur le même double et vérifie qu'il double bien les crédits. Sans lui, un
 * test vert ne prouverait rien sur la capacité du harnais à détecter la
 * régression.
 */
import { test, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

const DAY = 86_400_000;
const tick = () => new Promise((resolve) => setImmediate(resolve));

interface FakePayment {
  id: string;
  providerRef: string;
  userId: string;
  plan: string;
  seats: number | null;
  status: string;
}
interface FakeUser {
  id: string;
  plan: string;
  planExpiresAt: Date | null;
  credits: number;
  role: string;
}

const payments = new Map<string, FakePayment>();
const users = new Map<string, FakeUser>();
const centers = new Map<string, { id: string; ownerId: string; seats: number }>();
/** Dotations de sièges datées (CenterSeatGrant). */
const grants: { centerId: string; seats: number; paymentRef: string }[] = [];

const tx = {
  payment: {
    updateMany: async ({
      where,
      data,
    }: {
      where: { providerRef: string; status: string };
      data: { status: string };
    }) => {
      await tick(); // entrelacement AVANT la section atomique
      // ── section atomique : pas de `await` entre le test et l'écriture ──
      const payment = payments.get(where.providerRef);
      if (!payment || payment.status !== where.status) return { count: 0 };
      payment.status = data.status;
      return { count: 1 };
    },
    findUnique: async ({ where }: { where: { providerRef: string } }) => {
      await tick();
      const payment = payments.get(where.providerRef);
      // Prisma renvoie un INSTANTANÉ, pas une référence vivante : sans cette
      // copie, un appel concurrent verrait les mutations de l'autre et le
      // double masquerait la course qu'il est censé reproduire.
      return payment ? { ...payment } : null;
    },
  },
  user: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      await tick();
      const user = users.get(where.id);
      return user ? { ...user } : null;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      await tick();
      const user = users.get(where.id)!;
      if (typeof data.plan === "string") user.plan = data.plan;
      if (typeof data.role === "string") user.role = data.role;
      if (data.planExpiresAt instanceof Date) user.planExpiresAt = data.planExpiresAt;
      const credits = data.credits as { increment?: number } | undefined;
      if (credits?.increment) user.credits += credits.increment;
      return user;
    },
  },
  center: {
    findUnique: async ({ where }: { where: { ownerId: string } }) => {
      await tick();
      return [...centers.values()].find((c) => c.ownerId === where.ownerId) ?? null;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { seats?: { increment?: number } };
    }) => {
      await tick();
      const center = centers.get(where.id)!;
      if (data.seats?.increment) center.seats += data.seats.increment;
      return center;
    },
    create: async ({ data }: { data: { ownerId: string; seats?: number } }) => {
      await tick();
      const center = { id: `c-${data.ownerId}`, ownerId: data.ownerId, seats: data.seats ?? 0 };
      centers.set(center.id, center);
      return center;
    },
  },
  // Verrou de ligne du centre : sérialisation réelle prouvée sur PostgreSQL
  // (tests/int-commercial.test.ts) ; ce double n'en a pas besoin.
  $queryRaw: async () => [],
  centerSeatGrant: {
    aggregate: async () => ({ _max: { expiresAt: null } }),
    create: async ({
      data,
    }: {
      data: { centerId: string; seats: number; paymentRef: string };
    }) => {
      await tick();
      grants.push({ centerId: data.centerId, seats: data.seats, paymentRef: data.paymentRef });
      return data;
    },
  },
};

mock.module("@/lib/auth", { namedExports: { auth: async () => null } });
mock.module("@/lib/db", {
  namedExports: {
    db: {
      $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) =>
        callback(tx),
      ...tx,
    },
  },
});

let activatePlanByRef: (providerRef: string) => Promise<boolean>;

before(async () => {
  activatePlanByRef = (await import("@/lib/billing")).activatePlanByRef;
});

beforeEach(() => {
  payments.clear();
  users.clear();
  centers.clear();
  grants.length = 0;
  users.set("u1", {
    id: "u1",
    plan: "FREE",
    planExpiresAt: null,
    credits: 2,
    role: "STUDENT",
  });
  payments.set("ref-1", {
    id: "p1",
    providerRef: "ref-1",
    userId: "u1",
    plan: "STUDENT",
    seats: null,
    status: "PENDING",
  });
});

test("référence inconnue : false, aucun effet", async () => {
  assert.equal(await activatePlanByRef("ref-inexistante"), false);
  assert.equal(users.get("u1")!.credits, 2);
});

test("activation nominale : plan, échéance et crédits accordés UNE fois", async () => {
  assert.equal(await activatePlanByRef("ref-1"), true);
  const user = users.get("u1")!;
  assert.equal(user.plan, "STUDENT");
  assert.equal(user.credits, 2 + 15); // PLAN_CREDITS.STUDENT
  assert.ok(user.planExpiresAt);
  assert.equal(payments.get("ref-1")!.status, "SUCCESS");
});

test("MEME webhook rejoue (sequentiel) : une seule activation", async () => {
  await activatePlanByRef("ref-1");
  const expiry = users.get("u1")!.planExpiresAt!.getTime();

  assert.equal(await activatePlanByRef("ref-1"), true); // no-op
  const user = users.get("u1")!;
  assert.equal(user.credits, 17, "les credits ne doivent pas etre doubles");
  assert.equal(
    user.planExpiresAt!.getTime(),
    expiry,
    "planExpiresAt ne doit pas etre prolonge deux fois",
  );
});

test("DEUX webhooks CONCURRENTS : une seule activation", async () => {
  const [a, b] = await Promise.all([
    activatePlanByRef("ref-1"),
    activatePlanByRef("ref-1"),
  ]);
  assert.deepEqual([a, b], [true, true]);

  const user = users.get("u1")!;
  assert.equal(user.credits, 17, "credits doubles : la course n'est pas fermee");
  assert.equal(user.plan, "STUDENT");
  const days = Math.round((user.planExpiresAt!.getTime() - Date.now()) / DAY);
  assert.equal(days, 30, "l'abonnement a ete prolonge deux fois");
});

test("CENTER concurrent : les sieges ne sont credites qu'une fois", async () => {
  payments.set("ref-c", {
    id: "p2",
    providerRef: "ref-c",
    userId: "u1",
    plan: "CENTER",
    seats: 10,
    status: "PENDING",
  });
  await Promise.all([activatePlanByRef("ref-c"), activatePlanByRef("ref-c")]);

  const center = [...centers.values()].find((c) => c.ownerId === "u1")!;
  assert.equal(grants.length, 1, "dotation de sieges doublee");
  assert.equal(grants[0].seats, 10);
  assert.equal(grants[0].centerId, center.id);
  // 2 (initial) + 0 (CENTER n'a pas de dotation directe) + 10 x 15 par siege
  assert.equal(users.get("u1")!.credits, 2 + 10 * 15);
  assert.equal(users.get("u1")!.role, "CENTER_ADMIN");
});

test("CANARI : l'ancien schema read-then-write echoue sur ce meme double", async () => {
  // Reproduction fidele de l'implementation d'avant le correctif.
  const naive = async (providerRef: string) => {
    const payment = await tx.payment.findUnique({ where: { providerRef } });
    if (!payment) return false;
    if (payment.status === "SUCCESS") return true; // test APPLICATIF
    payment.status = "SUCCESS";
    await tx.user.update({
      where: { id: payment.userId },
      data: { credits: { increment: 15 } },
    });
    return true;
  };

  await Promise.all([naive("ref-1"), naive("ref-1")]);
  assert.equal(
    users.get("u1")!.credits,
    2 + 15 + 15,
    "le harnais doit detecter la double activation de l'ancien code",
  );
});
