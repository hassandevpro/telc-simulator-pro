/**
 * Tarification des sièges de centre (lib/center-pricing.ts) — logique pure.
 * Tarifs de référence (config/pricing.ts) : 2 500 FCFA / 4,00 € par siège et
 * par période de 30 jours ; 15 crédits par siège (config/credits.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAY_MS,
  creditsForGrant,
  grantWindow,
  quoteCenterPurchase,
  remainingBilledDays,
} from "@/lib/center-pricing";

const NOW = new Date("2026-10-01T12:00:00Z");
const inDays = (days: number) => new Date(NOW.getTime() + days * DAY_MS);
const NONE = { activeEnd: null, lastEnd: null };

function quote(input: Parameters<typeof quoteCenterPurchase>[0]) {
  const result = quoteCenterPurchase({ now: NOW, ...input });
  assert.equal(result.ok, true, JSON.stringify(result));
  return (result as Extract<typeof result, { ok: true }>).quote;
}

/* ─────────────────────────── NEW ─────────────────────────── */

test("aucun siège actif : NEW, prix plein, 30 jours à partir de maintenant", () => {
  const q = quote({ state: NONE, seats: 10, currency: "XAF" });
  assert.equal(q.mode, "NEW");
  assert.equal(q.amount, 25_000);
  assert.deepEqual([q.startsAt, q.expiresAt], [NOW, inDays(30)]);
  assert.equal(q.billedDays, 30);
  assert.equal(q.credits, 150);
  assert.equal(quote({ state: NONE, seats: 10, currency: "EUR" }).amount, 40);
});

test("sièges expirés : redevient NEW, sans choix à faire", () => {
  const q = quote({ state: { activeEnd: inDays(-1), lastEnd: inDays(-1) }, seats: 3, currency: "XAF" });
  assert.equal(q.mode, "NEW");
  assert.equal(q.startsAt.getTime(), NOW.getTime());
});

/* ───────────────────────── RENEW ───────────────────────── */

test("RENEW : la nouvelle période COMMENCE à la fin de la période payée, prix plein", () => {
  const q = quote({ state: { activeEnd: inDays(12), lastEnd: inDays(12) }, seats: 20, requested: "renew", currency: "XAF" });
  assert.equal(q.mode, "RENEW");
  assert.equal(q.amount, 50_000);
  assert.equal(q.startsAt.getTime(), inDays(12).getTime());
  assert.equal(q.expiresAt.getTime(), inDays(42).getTime());
  assert.equal(q.credits, 300);
});

test("RENEW anticipé répété : s'enchaîne après la dernière période déjà payée", () => {
  // Période en cours jusqu'à J+5, renouvellement déjà payé jusqu'à J+35.
  const q = quote({ state: { activeEnd: inDays(5), lastEnd: inDays(35) }, seats: 1, requested: "renew", currency: "XAF" });
  assert.equal(q.startsAt.getTime(), inDays(35).getTime());
  assert.equal(q.expiresAt.getTime(), inDays(65).getTime());
});

test("RENEW : un renouvellement anticipé ne fait payer aucun jour deux fois", () => {
  const q = quote({ state: { activeEnd: inDays(25), lastEnd: inDays(25) }, seats: 20, requested: "renew", currency: "XAF" });
  // Les 25 jours restants ne sont pas rachetés : la période payée court de J+25 à J+55.
  assert.equal((q.expiresAt.getTime() - q.startsAt.getTime()) / DAY_MS, 30);
  assert.equal(q.startsAt.getTime() - NOW.getTime(), 25 * DAY_MS);
});

/* ─────────────────────────── ADD ─────────────────────────── */

test("ADD : sièges supplémentaires jusqu'à l'échéance, au prorata des jours restants", () => {
  // 10 jours restants, 10 sièges : 2 500 × 10 × 10 / 30 = 8 333,33 → 8 333 FCFA.
  const state = { activeEnd: inDays(10), lastEnd: inDays(10) };
  const xaf = quote({ state, seats: 10, requested: "add", currency: "XAF" });
  assert.equal(xaf.mode, "ADD");
  assert.equal(xaf.amount, 8_333);
  assert.equal(xaf.billedDays, 10);
  assert.deepEqual([xaf.startsAt, xaf.expiresAt], [NOW, inDays(10)]);
  assert.equal(xaf.credits, 50, "15 × 10 × 10 / 30 = 50 crédits");
  // Euro : 4 × 10 × 10 / 30 = 13,333… → 13,33 €.
  assert.equal(quote({ state, seats: 10, requested: "add", currency: "EUR" }).amount, 13.33);
});

test("ADD : tout jour entamé est dû (9,2 jours restants = 10 jours), minimum 1 jour", () => {
  assert.equal(remainingBilledDays(NOW, new Date(NOW.getTime() + 9.2 * DAY_MS)), 10);
  assert.equal(remainingBilledDays(NOW, new Date(NOW.getTime() + 60_000)), 1);
  const q = quote({ state: { activeEnd: new Date(NOW.getTime() + 3_600_000), lastEnd: null }, seats: 1, requested: "add", currency: "XAF" });
  assert.equal(q.billedDays, 1);
  assert.equal(q.amount, 83, "2 500 / 30 = 83,33 → 83");
});

test("ADD : jamais plus cher que le prix plein sur une période de 30 jours, croissant avec les jours", () => {
  let previous = 0;
  for (let days = 1; days <= 30; days += 1) {
    const q = quote({ state: { activeEnd: inDays(days), lastEnd: inDays(days) }, seats: 7, requested: "add", currency: "XAF" });
    assert.ok(q.amount >= previous, `croissant à ${days} j`);
    assert.ok(q.amount <= 7 * 2_500, `plafonné à ${days} j`);
    previous = q.amount;
  }
  assert.equal(previous, 17_500, "30 jours = prix plein");
});

test("ADD sur une période longue (reprise historique de 45 jours) : facturé au prorata réel, sans plafond", () => {
  const q = quote({ state: { activeEnd: inDays(45), lastEnd: inDays(45) }, seats: 2, requested: "add", currency: "XAF" });
  assert.equal(q.billedDays, 45);
  assert.equal(q.amount, 7_500, "2 × 2 500 × 45 / 30");
});

test("ADD n'allonge rien : l'échéance reste celle de la période en cours", () => {
  const q = quote({ state: { activeEnd: inDays(8), lastEnd: inDays(38) }, seats: 4, requested: "add", currency: "XAF" });
  assert.equal(q.expiresAt.getTime(), inDays(8).getTime());
});

/* ───────────────────── Choix obligatoire ───────────────────── */

test("sièges actifs et aucun choix : le serveur refuse de deviner", () => {
  const result = quoteCenterPurchase({ now: NOW, state: { activeEnd: inDays(10), lastEnd: inDays(10) }, seats: 5, currency: "XAF" });
  assert.equal(result.ok, false);
  assert.equal((result as { code: string }).code, "CENTER_MODE_REQUIRED");
});

test("sans siège actif, le choix demandé est ignoré (rien à renouveler ni à compléter)", () => {
  for (const requested of ["renew", "add"] as const) {
    assert.equal(quote({ state: NONE, seats: 5, requested, currency: "XAF" }).mode, "NEW");
  }
});

/* ───────────────────────── Activation ───────────────────────── */

test("grantWindow : RENEW/NEW s'enchaînent après la dernière période, sinon maintenant", () => {
  const chained = grantWindow({ mode: "RENEW", periodDays: null, state: { activeEnd: inDays(5), lastEnd: inDays(35) }, now: NOW });
  assert.deepEqual([chained.startsAt, chained.expiresAt], [inDays(35), inDays(65)]);
  const fresh = grantWindow({ mode: "RENEW", periodDays: null, state: NONE, now: NOW });
  assert.deepEqual([fresh.startsAt, fresh.expiresAt], [NOW, inDays(30)]);
});

test("grantWindow : ADD jusqu'à l'échéance en cours ; si elle a expiré, autant que ce qui a été payé", () => {
  const live = grantWindow({ mode: "ADD", periodDays: 10, state: { activeEnd: inDays(6), lastEnd: inDays(6) }, now: NOW });
  assert.deepEqual([live.startsAt, live.expiresAt], [NOW, inDays(6)]);
  const lapsed = grantWindow({ mode: "ADD", periodDays: 10, state: NONE, now: NOW });
  assert.deepEqual([lapsed.startsAt, lapsed.expiresAt], [NOW, inDays(10)]);
});

test("grantWindow : paiement ANTÉRIEUR à la règle (mode inconnu) = ancien traitement, 30 jours dès maintenant", () => {
  for (const mode of [null, "???"]) {
    const w = grantWindow({ mode, periodDays: null, state: { activeEnd: inDays(20), lastEnd: inDays(20) }, now: NOW });
    assert.deepEqual([w.startsAt, w.expiresAt], [NOW, inDays(30)]);
  }
});

test("crédits : pleins pour NEW/RENEW/ancien, au prorata pour ADD", () => {
  assert.equal(creditsForGrant("NEW", 10, null), 150);
  assert.equal(creditsForGrant("RENEW", 10, null), 150);
  assert.equal(creditsForGrant(null, 10, null), 150);
  assert.equal(creditsForGrant("ADD", 10, 10), 50);
  assert.equal(creditsForGrant("ADD", 1, 1), 1, "arrondi à l'entier");
});
