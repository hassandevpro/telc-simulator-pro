/**
 * Règles de sécurité testables sans base : liaison Google, fraîcheur du rôle
 * dans le JWT, autosave (erreurs visibles et récupérables), limiteur de
 * débit, comparaison de secret de webhook.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_REFRESH_MS,
  decideGoogleSignIn,
  refreshRoleToken,
} from "@/lib/auth-policy";
import { retryDelayMs, saveAnswersOnce } from "@/lib/autosave";
import { SessionWriteError } from "@/lib/repository/session-repository";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";
import { verifySharedSecret } from "@/lib/payments/webhook-signature";
import type { AnswerMap } from "@/types/session";

/* ─────────────────────────── Liaison Google ──────────────────────────── */

test("Google : compte à mot de passe NON vérifié → liaison refusée (pré-prise de compte)", () => {
  // Scénario d'attaque : l'attaquant a inscrit l'adresse de la victime.
  const squatted = { passwordHash: "bcrypt$attaquant", emailVerifiedBy: null };
  assert.deepEqual(decideGoogleSignIn(squatted, true), {
    kind: "refuse",
    reason: "ACCOUNT_UNVERIFIED",
  });
});

test("Google : compte historique « vérifié d'office » (sans preuve) → refusé aussi", () => {
  // emailVerified était posé à l'inscription : seule emailVerifiedBy compte.
  assert.equal(
    decideGoogleSignIn({ passwordHash: "h", emailVerifiedBy: null }, true).kind,
    "refuse",
  );
});

test("Google : compte à mot de passe vérifié PAR LIEN → liaison autorisée", () => {
  assert.deepEqual(decideGoogleSignIn({ passwordHash: "h", emailVerifiedBy: "LINK" }, true), {
    kind: "link",
  });
});

test("Google : compte Google existant → liaison ; adresse inconnue → création", () => {
  assert.equal(decideGoogleSignIn({ passwordHash: null, emailVerifiedBy: "GOOGLE" }, true).kind, "link");
  assert.equal(decideGoogleSignIn(null, true).kind, "create");
});

test("Google : e-mail non vérifié CHEZ Google → toujours refusé", () => {
  assert.deepEqual(decideGoogleSignIn(null, false), {
    kind: "refuse",
    reason: "GOOGLE_EMAIL_UNVERIFIED",
  });
  assert.equal(decideGoogleSignIn({ passwordHash: null, emailVerifiedBy: "GOOGLE" }, false).kind, "refuse");
});

/* ───────────────────── 9. Rôle révoqué dans le JWT ───────────────────── */

test("9. JWT : rôle ADMIN révoqué en base → le jeton est rétrogradé au rafraîchissement", async () => {
  const now = 1_000_000;
  const token = { sub: "u1", role: "SUPER_ADMIN", plan: "PREMIUM", checkedAt: now - ROLE_REFRESH_MS - 1 };
  const refreshed = await refreshRoleToken(token, async () => ({ role: "STUDENT", plan: "FREE" }), now);
  assert.equal(refreshed?.role, "STUDENT");
  assert.equal(refreshed?.plan, "FREE");
  assert.equal(refreshed?.checkedAt, now);
});

test("9. JWT : compte SUPPRIMÉ → session invalidée (null)", async () => {
  const token = { sub: "u1", role: "SUPER_ADMIN", checkedAt: 0 };
  assert.equal(await refreshRoleToken(token, async () => null, ROLE_REFRESH_MS + 1), null);
});

test("JWT : relu au plus toutes les 60 s (pas de requête à chaque appel)", async () => {
  let loads = 0;
  const token = { sub: "u1", role: "STUDENT", checkedAt: 10_000 };
  await refreshRoleToken(token, async () => (loads++, { role: "STUDENT", plan: "FREE" }), 10_000 + ROLE_REFRESH_MS - 1);
  assert.equal(loads, 0);
  // Jeton émis avant ce correctif (sans checkedAt) : relu immédiatement.
  await refreshRoleToken({ sub: "u1", role: "SUPER_ADMIN" }, async () => (loads++, { role: "STUDENT", plan: "FREE" }));
  assert.equal(loads, 1);
});

test("JWT sans identifiant : invalidé", async () => {
  assert.equal(await refreshRoleToken({ role: "SUPER_ADMIN" }, async () => ({ role: "SUPER_ADMIN", plan: "FREE" })), null);
});

/* ────────────── 10. Autosave : erreurs visibles et récupérables ──────── */

function fakeStore(initial: AnswerMap) {
  const state = {
    answers: initial,
    hasUnsavedChanges: true,
    markSavedIfUnchanged(snapshot: AnswerMap) {
      if (state.answers === snapshot) state.hasUnsavedChanges = false;
    },
  };
  return { state, store: { getState: () => state } };
}

test("10. autosave : échec réseau → erreur signalée, réponses TOUJOURS non sauvegardées, puis reprise", async () => {
  const { state, store } = fakeStore({ q1: "a" });
  let fail = true;
  const sent: AnswerMap[] = [];
  const repository = {
    saveAnswers: async (_id: string, answers: AnswerMap) => {
      sent.push(answers);
      if (fail) throw new SessionWriteError("Netzwerkfehler.", 0, "NETWORK");
    },
  };

  const first = await saveAnswersOnce("s1", repository, store);
  assert.equal(first.kind, "retry");
  assert.equal(state.hasUnsavedChanges, true, "un échec ne doit JAMAIS marquer sauvegardé");

  fail = false;
  const second = await saveAnswersOnce("s1", repository, store);
  assert.equal(second.kind, "saved");
  assert.equal(state.hasUnsavedChanges, false);
  assert.deepEqual(sent[1], { q1: "a" }, "la reprise renvoie les mêmes réponses");
});

test("10. autosave : erreur serveur 5xx → réessayable ; refus 409 (épreuve close) → définitif", async () => {
  const { store } = fakeStore({ q1: "a" });
  const failing = (error: Error) => ({ saveAnswers: async () => { throw error; } });

  assert.equal((await saveAnswersOnce("s1", failing(new SessionWriteError("x", 503, "SAVE_FAILED")), store)).kind, "retry");
  const locked = await saveAnswersOnce("s1", failing(new SessionWriteError("x", 409, "SESSION_EXPIRED")), store);
  assert.deepEqual(locked, { kind: "locked", code: "SESSION_EXPIRED", error: "x" });
  // Erreur inattendue (non typée) : on réessaie plutôt que d'abandonner.
  assert.equal((await saveAnswersOnce("s1", failing(new TypeError("boom")), store)).kind, "retry");
});

test("10. autosave : réponse saisie PENDANT l'écriture → reste en attente", async () => {
  const { state, store } = fakeStore({ q1: "a" });
  const repository = {
    saveAnswers: async () => {
      state.answers = { q1: "a", q2: "b" }; // frappe pendant la requête
    },
  };
  assert.equal((await saveAnswersOnce("s1", repository, store)).kind, "saved");
  assert.equal(state.hasUnsavedChanges, true, "q2 n'a pas été envoyée");
});

test("autosave : délais de reprise croissants, plafonnés à 30 s", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 10].map(retryDelayMs), [2000, 4000, 8000, 16000, 30000, 30000]);
});

/* ─────────────────────────── Limiteur de débit ───────────────────────── */

test("rate limit : la (N+1)e requête de la fenêtre est refusée, la fenêtre suivante repart", () => {
  resetRateLimits();
  const results = Array.from({ length: 6 }, () => rateLimit("k", 5, 1000, 0).allowed);
  assert.deepEqual(results, [true, true, true, true, true, false]);
  assert.equal(rateLimit("k", 5, 1000, 1001).allowed, true);
  assert.equal(rateLimit("autre", 5, 1000, 0).allowed, true, "clés indépendantes");
});

/* ─────────────────── Secret partagé de webhook (FLW) ─────────────────── */

test("verifySharedSecret : égalité exacte, longueurs différentes sans exception", () => {
  assert.equal(verifySharedSecret("hash-de-test", "hash-de-test"), true);
  assert.equal(verifySharedSecret("hash-de-tesT", "hash-de-test"), false);
  assert.equal(verifySharedSecret("x", "hash-de-test"), false);
  assert.equal(verifySharedSecret("", "hash-de-test"), false);
  assert.equal(verifySharedSecret(null, "hash-de-test"), false);
  assert.equal(verifySharedSecret("hash-de-test", undefined), false, "secret non configuré : refus");
});
