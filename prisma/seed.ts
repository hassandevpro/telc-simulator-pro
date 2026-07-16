import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { TELC_B2 } from "../src/config/exam-structure";

/**
 * Seed de démonstration.
 * Crée : un super-admin, un candidat, et un examen B2 dont les ExamParts
 * sont dérivés de la structure officielle (config/exam-structure.ts).
 * Le CONTENU des questions (textes, audios, options) sera saisi via
 * l'admin (Sprint 10) — la structure de la base est déjà complète.
 *
 * Exécution : npx prisma db seed   (nécessite DATABASE_URL)
 */
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const db = new PrismaClient({ adapter });

async function main() {
  // Utilisateurs de démonstration.
  // admin@telc-simulator.local / admin1234 · kandidat@telc-simulator.local / kandidat1234
  // À CHANGER avant toute mise en production.
  const admin = await db.user.upsert({
    where: { email: "admin@telc-simulator.local" },
    update: {},
    create: {
      email: "admin@telc-simulator.local",
      passwordHash: bcrypt.hashSync("admin1234", 10),
      name: "Administrator",
      role: "SUPER_ADMIN",
      plan: "PREMIUM",
    },
  });

  const student = await db.user.upsert({
    where: { email: "kandidat@telc-simulator.local" },
    update: {},
    create: {
      email: "kandidat@telc-simulator.local",
      passwordHash: bcrypt.hashSync("kandidat1234", 10),
      name: "Max Mustermann",
      role: "STUDENT",
      plan: "STUDENT",
    },
  });

  // Examen B2 de démonstration — un ExamPart par Teil de la structure officielle.
  const exam = await db.exam.create({
    data: {
      title: "telc Deutsch B2 — Modelltest 1",
      level: "B2",
      isPublished: false,
    },
  });

  for (const section of TELC_B2.schriftlichePruefung.sections) {
    for (const part of section.parts) {
      await db.examPart.create({
        data: {
          examId: exam.id,
          sectionId: section.id,
          partId: part.id,
          sharedContent: undefined, // saisi via l'admin (Sprint 10)
        },
      });
    }
  }

  console.log("Seed terminé :");
  console.log(`  admin     : ${admin.email}`);
  console.log(`  candidat  : ${student.email}`);
  console.log(`  examen    : ${exam.title} (${exam.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
