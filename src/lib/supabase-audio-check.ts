/**
 * Contrôle de la configuration RÉELLE du bucket « audio » — lecture seule,
 * à lancer par un humain avec ses propres clés (npm run check:audio).
 * Ce code ne peut pas SAVOIR comment est réglé Supabase : il le DEMANDE à
 * l'API, exactement comme le ferait un attaquant avec la clé publique.
 *
 * `fetchFn` est injectable : les tests le branchent sur un faux serveur.
 */

export interface AudioCheckEnv {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  bucket?: string;
}

export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export interface CheckResult {
  id: string;
  status: CheckStatus;
  title: string;
  detail: string;
}

type FetchFn = typeof fetch;

export async function checkAudioBucket(
  env: AudioCheckEnv,
  fetchFn: FetchFn = fetch,
): Promise<CheckResult[]> {
  const base = env.supabaseUrl.replace(/\/+$/, "");
  const bucket = env.bucket ?? "audio";
  const results: CheckResult[] = [];
  const add = (id: string, status: CheckStatus, title: string, detail: string) =>
    results.push({ id, status, title, detail });

  const service = {
    Authorization: `Bearer ${env.serviceKey}`,
    apikey: env.serviceKey,
  };
  const anon = { Authorization: `Bearer ${env.anonKey}`, apikey: env.anonKey };

  // 1. Le bucket est-il privé ? (clé de service : lecture des réglages)
  let bucketInfo: { public?: boolean; file_size_limit?: number | null; allowed_mime_types?: string[] | null } | null =
    null;
  try {
    const response = await fetchFn(`${base}/storage/v1/bucket/${bucket}`, { headers: service });
    if (response.ok) bucketInfo = await response.json();
    else add("bucket", "fail", "Lecture du bucket", `HTTP ${response.status} — clé de service invalide ou bucket « ${bucket} » absent.`);
  } catch (cause) {
    add("bucket", "fail", "Lecture du bucket", `Supabase injoignable : ${String(cause)}`);
  }
  if (bucketInfo) {
    add(
      "private",
      bucketInfo.public === false ? "pass" : "fail",
      "Le bucket est privé",
      bucketInfo.public === false
        ? "public = false : aucune URL permanente ne sert les fichiers."
        : "public = true : N'IMPORTE QUI peut télécharger les audios avec leur URL. Désactiver « Public bucket » dans Supabase.",
    );
    add(
      "limits",
      bucketInfo.file_size_limit && bucketInfo.allowed_mime_types?.length ? "pass" : "warn",
      "Taille maximale et types de fichiers du bucket",
      `file_size_limit = ${bucketInfo.file_size_limit ?? "aucune"}, allowed_mime_types = ${
        bucketInfo.allowed_mime_types?.join(", ") ?? "aucun"
      }. Un jeton d'upload signé ne borne ni la taille ni le type : à fixer côté bucket.`,
    );
  }

  // 2. Un fichier existant est-il lisible SANS authentification ?
  let sample: string | null = null;
  try {
    const response = await fetchFn(`${base}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { ...service, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 1 }),
    });
    if (response.ok) {
      const files = (await response.json()) as { name?: string }[];
      sample = files.find((file) => file.name && !file.name.startsWith("."))?.name ?? null;
    }
  } catch {
    // traité ci-dessous
  }
  if (!sample) {
    add("public-read", "skip", "Lecture anonyme d'un fichier existant", "Aucun fichier dans le bucket : test impossible.");
  } else {
    const response = await fetchFn(
      `${base}/storage/v1/object/public/${bucket}/${encodeURIComponent(sample)}`,
    );
    add(
      "public-read",
      response.status === 200 ? "fail" : "pass",
      "Lecture anonyme d'un fichier existant refusée",
      response.status === 200
        ? `L'URL publique de « ${sample} » répond 200 : le bucket est lisible par tous.`
        : `L'URL publique répond ${response.status} (refus attendu).`,
    );
  }

  // 3. La clé publique peut-elle ÉCRIRE ? Sonde unique, supprimée aussitôt si elle réussit.
  const probe = `__write-probe-${Date.now()}.txt`;
  let wrote = false;
  try {
    const response = await fetchFn(`${base}/storage/v1/object/${bucket}/${probe}`, {
      method: "POST",
      headers: { ...anon, "Content-Type": "text/plain" },
      body: "probe",
    });
    wrote = response.ok;
    add(
      "anon-write",
      wrote ? "fail" : "pass",
      "Écriture avec la clé publique (anon) refusée",
      wrote
        ? "La clé anon a pu CRÉER un fichier : supprimer les règles INSERT pour anon/authenticated sur storage.objects."
        : `Écriture refusée (HTTP ${response.status}).`,
    );
  } catch (cause) {
    add("anon-write", "fail", "Écriture avec la clé publique (anon)", `Test impossible : ${String(cause)}`);
  }
  if (wrote) {
    // Nettoyage de NOTRE sonde uniquement (jamais d'autre fichier).
    await fetchFn(`${base}/storage/v1/object/${bucket}/${probe}`, {
      method: "DELETE",
      headers: service,
    }).catch(() => undefined);
  }

  // 4. La clé publique peut-elle LISTER le bucket ?
  try {
    const response = await fetchFn(`${base}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { ...anon, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 1 }),
    });
    let listed = 0;
    if (response.ok) listed = ((await response.json()) as unknown[]).length;
    add(
      "anon-list",
      listed > 0 ? "fail" : "pass",
      "Liste du bucket avec la clé publique refusée",
      listed > 0
        ? "La clé anon voit la liste des fichiers (règle SELECT sur storage.objects)."
        : "Aucun fichier visible avec la clé publique.",
    );
  } catch (cause) {
    add("anon-list", "warn", "Liste du bucket avec la clé publique", `Test impossible : ${String(cause)}`);
  }

  return results;
}

export function summarize(results: CheckResult[]): { ok: boolean; failures: number } {
  const failures = results.filter((result) => result.status === "fail").length;
  return { ok: failures === 0, failures };
}
