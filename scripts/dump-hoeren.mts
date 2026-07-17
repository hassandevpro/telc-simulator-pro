/**
 * Affiche les scripts Hören d'un examen généré. Lancer :
 *   npx tsx scripts/dump-hoeren.mts [seed]
 */
import { generateExam } from "@/lib/generator";

const seed = process.argv[2] ?? "demo-2026";
const exam = await generateExam({ seed });

console.log(`# Hörskripte — ${exam.title}\n`);
for (const s of exam.hoerenScripts) {
  console.log(`## ${s.partKey}  (Sprecher: ${s.speakers.join(", ")} · ~${s.targetSeconds}s)\n`);
  console.log(s.text + "\n");
  console.log("──────────\n");
}
