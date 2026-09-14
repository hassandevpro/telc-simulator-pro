import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { LESSONS, TRACKS } from "@/content/vorbereitung";

/**
 * Chiffres de la Vorbereitung dérivés du catalogue : la landing ne peut pas
 * annoncer un nombre de leçons que le contenu ne tient pas.
 */
const LESSON_COUNT = LESSONS.length;
const EXERCISE_COUNT = LESSONS.reduce(
  (total, lesson) => total + lesson.exercises.length,
  0,
);

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
          derselbe Ablauf, dieselbe Navigation, derselbe Zeitdruck. Davor:
          eine freie Vorbereitung mit Grammatik, Redemitteln und Übungen.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/register">
            <Button variant="primary">Kostenlos testen</Button>
          </Link>
          <Link href="/vorbereitung">
            <Button variant="secondary">Vorbereitung ansehen</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="ghost">Preise</Button>
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

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Vorbereitung — frei zugänglich
          </h2>
          <span className="text-[12px] text-muted">
            {LESSON_COUNT} Lektionen · {EXERCISE_COUNT} Übungen · ohne Konto
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
          Vor dem ersten Modelltest: das Format jedes Prüfungsteils, die
          Grammatik von B1 bis B2 und fertige Redemittel für den
          schriftlichen Ausdruck — mit Übungen, die sofort korrigiert werden.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {TRACKS.map((track) => (
            <Link key={track.id} href="/vorbereitung" className="block">
              <Card className="h-full p-4 transition-colors duration-100 hover:bg-surface">
                <h3 className="text-[14px] font-semibold">{track.label}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {track.description}
                </p>
                <p className="mt-2.5 text-[12px] text-muted">
                  {LESSONS.filter((lesson) => lesson.track === track.id).length}{" "}
                  Lektionen
                </p>
              </Card>
            </Link>
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
