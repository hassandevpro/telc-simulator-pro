/**
 * Stub du marqueur `server-only` pour le runner de tests.
 * `server-only` n'est pas un paquet installé : c'est un marqueur que le
 * compilateur Next.js résout, et qui fait échouer un import côté client.
 * Hors Next (node:test), il n'est simplement pas résolvable — ce stub le
 * remplace via tsconfig.test.json, sans rien changer au build de l'app.
 */
export {};
