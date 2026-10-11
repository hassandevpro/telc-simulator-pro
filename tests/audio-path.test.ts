/** Chemins d'audio : extraction depuis les anciennes URL, noms sûrs et uniques. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  audioPathFromPublicUrl,
  isSafeAudioPath,
  isStaticAudioPath,
  uniqueAudioFileName,
} from "@/lib/audio-path";

const BASE = "https://projet.supabase.co/storage/v1/object";

test("ancienne URL publique → chemin du fichier", () => {
  assert.equal(audioPathFromPublicUrl(`${BASE}/public/audio/1760000000-piste.mp3`), "1760000000-piste.mp3");
  assert.equal(audioPathFromPublicUrl(`${BASE}/public/audio/seed-1-hoeren-teil-1.mp3?t=2026`), "seed-1-hoeren-teil-1.mp3");
  assert.equal(audioPathFromPublicUrl(`${BASE}/sign/audio/a.mp3?token=abc`), "a.mp3");
});

test("URL qui n'est pas celle du bucket audio, ou nom douteux → null", () => {
  assert.equal(audioPathFromPublicUrl(null), null);
  assert.equal(audioPathFromPublicUrl("/audio/demo/hoeren-teil-1.wav"), null);
  assert.equal(audioPathFromPublicUrl(`${BASE}/public/autre-bucket/x.mp3`), null);
  assert.equal(audioPathFromPublicUrl(`${BASE}/public/audio/dossier/x.mp3`), null);
  assert.equal(audioPathFromPublicUrl(`${BASE}/public/audio/..%2Fsecret.mp3`), null);
  assert.equal(audioPathFromPublicUrl(`${BASE}/public/audio/.cache`), null);
});

test("chemin accepté : une composante, caractères sûrs — aucune remontée de dossier", () => {
  for (const ok of ["a.mp3", "1760000000-ab12cd34-piste.mp3", "X_y-z.wav"]) {
    assert.equal(isSafeAudioPath(ok), true, ok);
  }
  for (const bad of ["", ".env", "../x.mp3", "a/b.mp3", "a\\b.mp3", "a b.mp3", "a.mp3\n", "é.mp3", "x".repeat(300), null, 3]) {
    assert.equal(isSafeAudioPath(bad), false, String(bad));
  }
});

test("chemin statique : interne à l'application uniquement", () => {
  assert.equal(isStaticAudioPath("/audio/demo/hoeren-teil-1.wav"), true);
  assert.equal(isStaticAudioPath("//evil.example/x.mp3"), false);
  assert.equal(isStaticAudioPath("https://evil.example/x.mp3"), false);
  assert.equal(isStaticAudioPath(null), false);
});

test("noms de fichiers uniques et assainis : jamais deux fois le même, jamais de remplacement", () => {
  const names = new Set<string>();
  for (let index = 0; index < 50; index += 1) {
    names.add(uniqueAudioFileName("seed-hoeren-teil-1.mp3", `id${index}`));
  }
  assert.equal(names.size, 50);
  const dirty = uniqueAudioFileName("../../etc/passwd é.mp3", "ab12cd34");
  assert.equal(isSafeAudioPath(dirty), true, dirty);
  assert.ok(!dirty.includes(".."));
  assert.equal(isSafeAudioPath(uniqueAudioFileName("", "ab12cd34")), true);
});
