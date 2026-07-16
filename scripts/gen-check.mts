/**
 * Contrôle qualité du générateur (hors app). Lancer :
 *   npx tsx scripts/gen-check.mts
 * Génère des examens COMPLETS sur plusieurs graines, valide chacun de bout en
 * bout et affiche un récapitulatif + un aperçu du premier examen.
 */
import { TELC_B2 } from "@/config/exam-structure";
import { generateExam, validateExam } from "@/lib/generator";

const seeds = ["alpha", "bravo", "charlie", "delta", "echo"];
let failures = 0;
const partSignatures = new Set<string>();

for (const seed of seeds) {
  const exam = await generateExam({ seed });
  const result = validateExam(TELC_B2, exam);
  const partCount = Object.keys(exam.parts).length;
  const itemCount = Object.values(exam.parts).reduce((n, p) => n + p.questions.length, 0);
  console.log(
    `seed "${seed}": ${partCount} Teile · ${itemCount} items · ${exam.hoerenScripts.length} Hörskripte · ` +
      (result.ok ? "VALIDE" : "INVALIDE"),
  );
  if (!result.ok) {
    failures += 1;
    result.errors.forEach((e) => console.log("  ! " + e));
  }
  // Signature de contenu pour mesurer la variété entre graines.
  const t2 = exam.parts["lesen/teil-2"];
  const src = t2.type === "MULTIPLE_CHOICE" ? (t2.shared.sourceText ?? "") : "";
  partSignatures.add(
    (exam.parts["lesen/teil-1"].questions[0].content as { text: string }).text.slice(0, 20) +
      "|" +
      src.slice(0, 20),
  );
}

console.log(`\nVariété (signatures distinctes) : ${partSignatures.size}/${seeds.length}`);

// Aperçu détaillé du premier examen.
const demo = await generateExam({ seed: seeds[0] });
console.log(`\n=== Aperçu — ${demo.title} ===`);
for (const [key, part] of Object.entries(demo.parts)) {
  console.log(`  ${key}: ${part.type} · ${part.questions.length} item(s)`);
}
console.log("\n  Hörskripte:");
demo.hoerenScripts.forEach((s) =>
  console.log(`   - ${s.partKey}: ${s.speakers.join("/")} · ~${s.targetSeconds}s · ${s.text.length} Zeichen`),
);
console.log("\n  Schreiben-Modelle:", demo.writingSolutions.map((w) => w.partKey).join(", "));

if (failures > 0) {
  console.error(`\n${failures}/${seeds.length} examen(s) invalide(s).`);
  process.exit(1);
}
console.log("\nTous les examens générés sont valides de bout en bout.");
