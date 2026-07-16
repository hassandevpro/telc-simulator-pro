/**
 * Identifiants d'options en lettres, conformes au format telc :
 * minuscules a, b, c… (titres Lesen T1, options MC) ou majuscules A, B, C…
 * (annonces Lesen T3, banque de mots Sprachbausteine T2).
 */
export function letterIds(count: number, upper = false): string[] {
  const base = upper ? 65 : 97; // 'A' | 'a'
  return Array.from({ length: count }, (_, i) => String.fromCharCode(base + i));
}
