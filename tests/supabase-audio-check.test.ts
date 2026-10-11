/**
 * Contrôle de configuration du bucket (src/lib/supabase-audio-check.ts) contre
 * un FAUX Supabase : on vérifie que le contrôle détecte un bucket public, une
 * lecture anonyme, une écriture anonyme — et qu'il est silencieux sur un bucket
 * correctement réglé. Ce test ne dit RIEN de la configuration réelle de votre
 * projet : pour cela, lancer `npm run check:audio` avec vos clés.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAudioBucket, summarize } from "@/lib/supabase-audio-check";

const ENV = { supabaseUrl: "https://projet.supabase.co", anonKey: "ANON", serviceKey: "SERVICE" };

interface FakeConfig {
  bucketPublic: boolean;
  anonCanWrite: boolean;
  anonCanList: boolean;
  files: string[];
}

function fakeSupabase(config: FakeConfig) {
  const calls: string[] = [];
  const deleted: string[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const asAnon = headers.apikey === "ANON";
    const asService = headers.apikey === "SERVICE";
    calls.push(`${method} ${url.replace(ENV.supabaseUrl, "")} ${asAnon ? "anon" : asService ? "service" : "none"}`);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

    if (url.endsWith("/storage/v1/bucket/audio")) {
      return asService ? json({ public: config.bucketPublic, file_size_limit: 20971520, allowed_mime_types: ["audio/mpeg"] }) : json({}, 401);
    }
    if (url.includes("/object/list/audio")) {
      if (asService || (asAnon && config.anonCanList)) return json(config.files.map((name) => ({ name })));
      return json([]);
    }
    if (url.includes("/object/public/audio/")) {
      return config.bucketPublic ? new Response("audio", { status: 200 }) : json({ error: "Bucket not found" }, 400);
    }
    if (url.includes("/object/audio/") && method === "POST") {
      return asAnon && config.anonCanWrite ? json({ Key: "ok" }) : json({ error: "new row violates row-level security policy" }, 403);
    }
    if (url.includes("/object/audio/") && method === "DELETE") {
      deleted.push(url);
      return json({});
    }
    return json({}, 404);
  }) as typeof fetch;
  return { fetchFn, calls, deleted };
}

const statusOf = (results: Awaited<ReturnType<typeof checkAudioBucket>>, id: string) =>
  results.find((result) => result.id === id)?.status;

test("bucket correctement réglé : aucun échec", async () => {
  const fake = fakeSupabase({ bucketPublic: false, anonCanWrite: false, anonCanList: false, files: ["a.mp3"] });
  const results = await checkAudioBucket(ENV, fake.fetchFn);
  assert.equal(summarize(results).ok, true);
  assert.equal(statusOf(results, "private"), "pass");
  assert.equal(statusOf(results, "public-read"), "pass");
  assert.equal(statusOf(results, "anon-write"), "pass");
  assert.deepEqual(fake.deleted, [], "rien à nettoyer");
});

test("bucket PUBLIC : détecté (réglage et lecture anonyme)", async () => {
  const results = await checkAudioBucket(
    ENV,
    fakeSupabase({ bucketPublic: true, anonCanWrite: false, anonCanList: false, files: ["a.mp3"] }).fetchFn,
  );
  assert.equal(statusOf(results, "private"), "fail");
  assert.equal(statusOf(results, "public-read"), "fail");
  assert.equal(summarize(results).ok, false);
});

test("écriture anonyme possible : détectée, et la sonde créée est supprimée", async () => {
  const fake = fakeSupabase({ bucketPublic: false, anonCanWrite: true, anonCanList: false, files: [] });
  const results = await checkAudioBucket(ENV, fake.fetchFn);
  assert.equal(statusOf(results, "anon-write"), "fail");
  assert.equal(fake.deleted.length, 1);
  assert.match(fake.deleted[0], /__write-probe-/, "seule la sonde est supprimée");
  assert.equal(statusOf(results, "public-read"), "skip", "bucket vide : lecture non testable");
});

test("liste anonyme possible : détectée", async () => {
  const results = await checkAudioBucket(
    ENV,
    fakeSupabase({ bucketPublic: false, anonCanWrite: false, anonCanList: true, files: ["a.mp3"] }).fetchFn,
  );
  assert.equal(statusOf(results, "anon-list"), "fail");
});

test("Supabase injoignable ou clé de service invalide : échec explicite, pas d'exception", async () => {
  const down = (async () => {
    throw new Error("ECONNREFUSED");
  }) as typeof fetch;
  const results = await checkAudioBucket(ENV, down);
  assert.equal(statusOf(results, "bucket"), "fail");
  assert.equal(summarize(results).ok, false);
});
