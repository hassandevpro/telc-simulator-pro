/**
 * Contrôle LECTURE SEULE du bucket « audio » de Supabase.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
 *   SUPABASE_SERVICE_ROLE_KEY=… npm run check:audio
 *
 * À lancer par un humain, contre l'environnement voulu (staging d'abord).
 * Il ne modifie aucun réglage. Seule l'étape « écriture avec la clé anon »
 * tente de créer UN fichier-sonde (`__write-probe-…`) ; si elle réussit, la
 * sonde est supprimée aussitôt et le contrôle échoue.
 * Code de sortie ≠ 0 si au moins un contrôle échoue.
 */
import { checkAudioBucket, summarize } from "../src/lib/supabase-audio-check";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error(
    "Variables requises : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(2);
}

const icon = { pass: "✔", fail: "✘", warn: "!", skip: "-" } as const;

const results = await checkAudioBucket({ supabaseUrl, anonKey, serviceKey });
for (const result of results) {
  console.log(`${icon[result.status]} ${result.title}\n    ${result.detail}`);
}
const { ok, failures } = summarize(results);
console.log(ok ? "\nAucun échec." : `\n${failures} contrôle(s) en échec.`);
process.exit(ok ? 0 : 1);
