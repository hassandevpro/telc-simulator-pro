/**
 * Utilitaires texte purs — importables côté serveur (scoring) comme côté
 * client (useWordCount), sans directive "use client".
 */

/** Compte les mots d'un texte (séparateurs : espaces et retours à la ligne). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return trimmed.split(/\s+/).length;
}
