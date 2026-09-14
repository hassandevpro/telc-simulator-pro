import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

/**
 * Lanceur de la suite de tests — MÊME outillage qu'avant (node:test + tsx),
 * simplement rendu exécutable par `npm test` sous Windows.
 *
 * Pourquoi ce fichier plutôt qu'une ligne dans package.json : la commande
 * documentée commence par `TSX_TSCONFIG_PATH=... node …`, une syntaxe POSIX
 * que cmd.exe (utilisé par npm sous Windows) ne comprend pas. On pose donc la
 * variable ici, en Node, sans ajouter de dépendance.
 *
 * TSX_TSCONFIG_PATH → tsconfig.test.json, qui redirige `server-only` vers un
 * stub (le vrai module refuse d'être chargé hors composant serveur).
 */
const root = path.resolve(import.meta.dirname, "..");
const testsDir = path.join(root, "tests");

const files = readdirSync(testsDir)
  .filter((name) => name.endsWith(".test.ts"))
  .sort()
  .map((name) => path.join("tests", name));

if (files.length === 0) {
  console.error("Aucun fichier tests/*.test.ts trouvé.");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--experimental-test-module-mocks", "--test", ...files],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, TSX_TSCONFIG_PATH: "tsconfig.test.json" },
  },
);

process.exit(result.status ?? 1);
