import Link from "next/link";
import { Button, Card } from "@/components/ui";

const FEATURES = [
  {
    title: "Unverfälschbarer Prüfungstimer",
    text: "Die Prüfungszeit läuft ab dem bestätigten Audiotest — ein Neuladen der Seite setzt nichts zurück, genau wie im Prüfungszentrum.",
  },
  {
    title: "Hörverstehen: nur EINMAL",
    text: "Audios lassen sich weder pausieren noch zurückspulen. Während der Wiedergabe ist die Navigation gesperrt — geantwortet wird beim Hören.",
  },
  {
    title: "Offizieller Ablauf, offizielle Nummerierung",
    text: "Lesen 1–20, Sprachbausteine 21–40, Hören 41–60, Schreiben mit Aufgabe A/B — Struktur und Bewertung folgen dem telc-Format.",
  },
  {
    title: "Sofortige Auswertung",
    text: "Punktzahl je Teil und Sektion, Bestehensgrenze und eine ehrliche Prognose: Wie viele Schreiben-Punkte fehlen noch zum Bestehen?",
  },
  {
    title: "Automatisches Speichern",
    text: "Jede Antwort wird laufend gesichert. Absturz, Stromausfall, versehentliches Schließen — nichts geht verloren.",
  },
  {
    title: "Für Sprachschulen",
    text: "Eigene Modelltests mit eigenem Audio über die Administration anlegen, veröffentlichen und Kandidatenkonten verwalten.",
  },
];

const STEPS = [
  { step: "1", title: "Audiotest", text: "Kopfhörer prüfen, Lautstärke einstellen, bestätigen — erst dann beginnt die Prüfungszeit." },
  { step: "2", title: "Prüfung", text: "140 Minuten: Lesen, Sprachbausteine, Hören (einmalige Wiedergabe) und Schreiben — mit globalem Timer." },
  { step: "3", title: "Ergebnis", text: "Abgeben, sofort auswerten lassen und sehen, wo Sie stehen — Teil für Teil." },
];

/** Landing — même langage visuel que le simulateur : sobre, dense, sans effets. */
export default function LandingPage() {
  return (
    <div className="space-y-12">
      <section className="border-b border-border pb-10 pt-4">
        <p className="text-[12px] uppercase tracking-widest text-muted">
          telc Deutsch B1 · B2 — Prüfungssimulation
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight">
          Trainieren Sie unter echten Prüfungsbedingungen.
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted">
          TELC Simulator Pro reproduziert die digitale telc-Prüfungsumgebung:
          derselbe Ablauf, dieselbe Navigation, derselbe Zeitdruck. Kein
          Sprachkurs — eine Prüfung.
        </p>
        <div className="mt-6 flex gap-2">
          <Link href="/register">
            <Button variant="primary">Kostenlos testen</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="secondary">Preise</Button>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Warum es sich echt anfühlt
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="p-4">
              <h3 className="text-[14px] font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {feature.text}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          So läuft es ab
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {STEPS.map((item) => (
            <Card key={item.step} muted className="p-4">
              <span className="font-mono text-[13px] text-muted">
                {item.step}
              </span>
              <h3 className="mt-1 text-[14px] font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {item.text}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
