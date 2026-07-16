import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TELC Simulator Pro",
  description:
    "Simulateur professionnel de l'examen telc B1/B2 — environnement d'examen officiel.",
};

/**
 * Layout racine.
 * Volontairement minimal : chaque route group ((marketing), (auth),
 * (dashboard), (exam), (admin)) définit son propre layout, radicalement
 * différent. Le mode examen en particulier est isolé du reste du produit.
 * Police : pile système (ui-sans-serif), conformément au design system —
 * aucune webfont, fidèle aux logiciels d'examen institutionnels.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
