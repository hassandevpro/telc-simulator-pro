/**
 * Design tokens — source TypeScript.
 * Pendant CSS : bloc @theme de src/app/globals.css (Tailwind v4).
 * Toute modification doit être répercutée dans les deux fichiers.
 *
 * Philosophie (ARCHITECTURE.md §8) : logiciel d'examen officiel.
 * Fond blanc, surfaces gris très clair, bordures fines 1 px,
 * aucun dégradé, aucune ombre, information dense.
 */
export const colors = {
  background: "#ffffff",
  surface: "#fafafa",
  border: "#e5e5e5",
  foreground: "#171717",
  muted: "#525252",
  /** Seul accent autorisé : états actifs / focus. */
  accent: "#1d4ed8",
  /** Réservé au timer < 5 min et aux erreurs bloquantes. */
  danger: "#dc2626",
} as const;

export const typography = {
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  /** Corps de texte dense — 14 px. */
  bodySize: "14px",
  /** Navigation et méta-informations — 13 px. */
  navSize: "13px",
} as const;

export const layout = {
  borderWidth: "1px",
  radius: "2px",
  /** Transitions limitées aux états focus/hover. */
  transitionMs: 100,
} as const;
