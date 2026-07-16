/**
 * Offres commerciales — Student / Center / Premium (+ FREE implicite).
 * Contenu marketing centralisé ici : la page /pricing et le gating du
 * catalogue lisent cette config. Les montants sont des valeurs de
 * lancement à ajuster librement ; aucun paiement en ligne en v1 —
 * l'attribution des plans se fait via l'administration.
 */

export interface PlanDefinition {
  id: "STUDENT" | "CENTER" | "PREMIUM";
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
}

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "STUDENT",
    name: "Student",
    price: "9,90 €",
    period: "pro Monat",
    description: "Für einzelne Kandidatinnen und Kandidaten.",
    features: [
      "Alle veröffentlichten Modelltests",
      "Originalgetreue Prüfungsumgebung",
      "Sofortige Auswertung mit Bestehensprognose",
      "Unbegrenzte Prüfungsdurchläufe",
    ],
    cta: { label: "Konto erstellen", href: "/register" },
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: "19,90 €",
    period: "pro Monat",
    description: "Für die intensive Prüfungsvorbereitung.",
    features: [
      "Alles aus Student",
      "Detaillierte Fortschrittsauswertung",
      "Priorisierter Support",
      "Frühzugang zu neuen Modelltests",
    ],
    cta: { label: "Konto erstellen", href: "/register" },
    highlighted: true,
  },
  {
    id: "CENTER",
    name: "Center",
    price: "4 €",
    period: "pro Platz / Monat",
    description: "Für Sprachschulen und Prüfungszentren.",
    features: [
      "Kontingent nach Anzahl Studierender",
      "Einladungslink + Schlüssel für den Beitritt",
      "Zentrale Verwaltung der Studierenden",
      "Voller Zugang zu den Modelltests für alle Plätze",
    ],
    cta: {
      label: "Kontakt aufnehmen",
      href: "mailto:kontakt@telc-simulator.example",
    },
  },
];

/** FREE : uniquement le Modelltest de démonstration. */
export function planIncludesFullCatalog(plan: string | undefined): boolean {
  return plan !== undefined && plan !== "FREE";
}
