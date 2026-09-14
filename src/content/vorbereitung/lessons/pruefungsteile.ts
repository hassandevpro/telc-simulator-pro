/**
 * Guides par épreuve — format officiel, barème, stratégie, pièges.
 *
 * Les CHIFFRES (nombre d'items, points, durée, seuil) ne sont jamais écrits à
 * la main ici : ils sont dérivés de `config/exam-structure.ts` et
 * `config/scoring.ts`. Le guide ne peut donc pas diverger du simulateur.
 */

import { TELC_B2, getSection } from "@/config/exam-structure";
import { SCORING } from "@/config/scoring";
import type { SectionId } from "@/types/exam";
import type { Lesson, LessonBlock } from "../types";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  TITLE_MATCHING: "Überschriften zuordnen",
  MULTIPLE_CHOICE: "Mehrfachauswahl",
  AD_MATCHING: "Anzeigen zuordnen",
  CLOZE_DROPDOWN: "Lückentext",
  WRITING: "Freier Text",
};

/** Tableau « Format » d'une section, construit depuis la config officielle. */
function formatTable(sectionId: SectionId): LessonBlock {
  const section = getSection(TELC_B2, sectionId);
  const rows =
    section?.parts.map((part) => [
      part.label,
      QUESTION_TYPE_LABELS[part.questionType] ?? part.questionType,
      `${part.itemCount}`,
      `${(part.itemCount * part.pointsPerItem).toLocaleString("de-DE")} Punkte`,
    ]) ?? [];

  return {
    kind: "table",
    head: ["Teil", "Aufgabentyp", "Aufgaben", "Punkte"],
    rows,
  };
}

/** Phrase de barème d'une section (points de la section / total / seuil). */
function scoreLine(sectionId: SectionId): string {
  const max = SCORING.B2.sectionMaxPoints[sectionId];
  const total = SCORING.B2.writtenMaxPoints;
  const pass = Math.round(total * SCORING.B2.writtenPassThreshold);
  return (
    `Dieser Prüfungsteil bringt ${max} von insgesamt ${total} Punkten der ` +
    `schriftlichen Prüfung. Bestanden ist die schriftliche Prüfung ab ` +
    `${pass} Punkten (${Math.round(SCORING.B2.writtenPassThreshold * 100)} %).`
  );
}

export const LESEN_GUIDE: Lesson = {
  slug: "leseverstehen",
  track: "pruefungsteile",
  title: "Leseverstehen",
  subtitle: "Drei Teile, drei Lesestrategien — und eine strenge Uhr.",
  levels: ["B1", "B2"],
  minutes: 8,
  sections: [
    {
      id: "format",
      title: "Das Format",
      blocks: [
        formatTable("lesen"),
        { kind: "text", body: scoreLine("lesen") },
        {
          kind: "text",
          body:
            "Leseverstehen und Sprachbausteine werden zusammen bearbeitet: " +
            "90 Minuten für beide Teile. Es gibt keine getrennte Uhr — du " +
            "teilst die Zeit selbst ein.",
        },
        {
          kind: "tip",
          body:
            "Plane rückwärts: rund 20 Minuten für die Sprachbausteine, " +
            "10 Minuten zum Übertragen und Prüfen, der Rest für das Lesen. " +
            "Wer beim Lesen trödelt, verliert die Sprachbausteine-Punkte, " +
            "die am schnellsten zu holen wären.",
        },
      ],
    },
    {
      id: "teil-1",
      title: "Teil 1 — Überschriften zuordnen",
      blocks: [
        {
          kind: "text",
          body:
            "Fünf kurze Texte, zehn Überschriften. Fünf Überschriften sind " +
            "Distraktoren und passen zu keinem Text. Jede Überschrift darf " +
            "nur einmal verwendet werden.",
        },
        {
          kind: "list",
          title: "Vorgehen",
          items: [
            "Zuerst alle zehn Überschriften lesen und die Schlüsselwörter markieren.",
            "Dann Text für Text: Worum geht es im Kern? In einem Satz zusammenfassen, bevor du in die Liste schaust.",
            "Die eindeutigen Zuordnungen zuerst setzen — jede gesetzte Überschrift verkleinert die Auswahl für den Rest.",
            "Zweifelsfälle am Ende entscheiden, wenn nur noch wenige Überschriften übrig sind.",
          ],
        },
        {
          kind: "pitfall",
          body:
            "Ein einzelnes gemeinsames Wort in Text und Überschrift beweist " +
            "nichts. Die Distraktoren sind genau so gebaut: sie greifen ein " +
            "Wort aus dem Text auf, treffen aber nicht die Hauptaussage.",
        },
      ],
    },
    {
      id: "teil-2",
      title: "Teil 2 — Mehrfachauswahl zum Text",
      blocks: [
        {
          kind: "text",
          body:
            "Ein längerer Text (Zeitungsartikel, Reportage, Sachtext) mit " +
            "fünf Fragen. Die Fragen folgen der Reihenfolge des Textes — " +
            "Frage 3 wird also nach der Stelle zu Frage 2 beantwortet.",
        },
        {
          kind: "list",
          title: "Vorgehen",
          items: [
            "Den Text einmal zügig lesen, ohne jedes Wort zu verstehen — nur den roten Faden.",
            "Die Frage lesen, BEVOR du die drei Antworten liest. Sonst denkst du in den Optionen statt im Text.",
            "Die passende Textstelle suchen und die Antwort dort belegen — Wort für Wort.",
            "Erst dann die Option wählen, die diese Textstelle umformuliert.",
          ],
        },
        {
          kind: "tip",
          body:
            "Die richtige Antwort ist fast nie die wörtliche Wiederholung " +
            "des Textes, sondern seine Umformulierung (Synonyme, " +
            "Nominalisierung, Passiv). Wörtliche Übereinstimmung ist eher " +
            "ein Warnsignal als ein Beweis.",
        },
      ],
    },
    {
      id: "teil-3",
      title: "Teil 3 — Anzeigen zuordnen",
      blocks: [
        {
          kind: "text",
          body:
            "Zwölf Anzeigen (A–L) und zehn Situationen. Zu jeder Situation " +
            "gehört höchstens eine Anzeige. Passt keine, ist die Antwort X — " +
            "und X ist bei mehreren Situationen richtig, nicht nur bei einer.",
        },
        {
          kind: "list",
          title: "Vorgehen",
          items: [
            "Von der Situation ausgehen, nicht von den Anzeigen: Wer sucht was, wann, wo, zu welchem Zweck?",
            "Diese Bedingungen als Filter nutzen. Eine Anzeige passt nur, wenn sie ALLE Bedingungen erfüllt.",
            "Eine einzige unerfüllte Bedingung (falscher Wochentag, falsche Zielgruppe, Vorkenntnisse nötig) schließt die Anzeige aus.",
            "Bleibt nichts übrig: X eintragen und weitergehen. X ist eine echte Antwort, kein Eingeständnis.",
          ],
        },
        {
          kind: "pitfall",
          body:
            "Die meisten Punkte gehen hier verloren, weil Kandidatinnen und " +
            "Kandidaten eine „fast passende“ Anzeige wählen, statt X zu " +
            "setzen. Fast passend heißt falsch.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "lesen-ex-1",
      kind: "choice",
      question:
        "Im Teil 3 erfüllt eine Anzeige vier von fünf Bedingungen der Situation. Was ist richtig?",
      options: [
        { id: "a", text: "Die Anzeige wählen — sie passt am besten." },
        { id: "b", text: "X eintragen, weil eine Bedingung nicht erfüllt ist." },
        { id: "c", text: "Die Aufgabe offen lassen und später raten." },
      ],
      answer: "b",
      explanation:
        "Im Teil 3 gilt Alles-oder-nichts: Eine einzige unerfüllte Bedingung " +
        "schließt die Anzeige aus. Genau dafür existiert die Option X.",
    },
    {
      id: "lesen-ex-2",
      kind: "choice",
      question:
        "Eine Antwortoption in Teil 2 wiederholt einen Satz des Textes fast wörtlich. Was folgt daraus?",
      options: [
        { id: "a", text: "Sie ist mit hoher Wahrscheinlichkeit richtig." },
        { id: "b", text: "Nichts — die Textstelle muss trotzdem geprüft werden." },
        { id: "c", text: "Sie ist automatisch ein Distraktor." },
      ],
      answer: "b",
      explanation:
        "Wörtliche Übereinstimmung ist weder Beweis noch Ausschluss. " +
        "Richtige Antworten sind meist Umformulierungen — aber entscheidend " +
        "ist immer der Beleg an der Textstelle.",
    },
    {
      id: "lesen-ex-3",
      kind: "choice",
      question:
        "Wie viele Minuten stehen für Leseverstehen und Sprachbausteine zusammen zur Verfügung?",
      options: [
        { id: "a", text: "60 Minuten" },
        { id: "b", text: "90 Minuten" },
        { id: "c", text: "140 Minuten" },
      ],
      answer: "b",
      explanation:
        "90 Minuten für beide Teile zusammen, ohne getrennte Uhr. Die " +
        "140 Minuten sind die Gesamtdauer der schriftlichen Prüfung " +
        "(inklusive Hören und Schreiben).",
    },
  ],
};

export const SPRACHBAUSTEINE_GUIDE: Lesson = {
  slug: "sprachbausteine",
  track: "pruefungsteile",
  title: "Sprachbausteine",
  subtitle: "30 Punkte in 20 Minuten — der effizienteste Prüfungsteil.",
  levels: ["B1", "B2"],
  minutes: 7,
  sections: [
    {
      id: "format",
      title: "Das Format",
      blocks: [
        formatTable("sprachbausteine"),
        { kind: "text", body: scoreLine("sprachbausteine") },
        {
          kind: "text",
          body:
            "Teil 1 prüft die GRAMMATIK: zu jeder Lücke stehen drei Formen " +
            "zur Wahl, meist Konnektoren, Präpositionen, Pronomen oder " +
            "Verbformen. Teil 2 prüft den WORTSCHATZ: eine gemeinsame Liste " +
            "von Wörtern für alle Lücken, aus der jedes Wort nur einmal " +
            "verwendet wird.",
        },
        {
          kind: "tip",
          body:
            "Punkte pro Minute ist hier am höchsten. Beginne die 90 Minuten " +
            "mit den Sprachbausteinen, solange du frisch bist — nicht am " +
            "Ende, wenn die Zeit drückt.",
        },
      ],
    },
    {
      id: "strategie",
      title: "Die Lückenlogik",
      blocks: [
        {
          kind: "list",
          title: "Bei jeder Lücke drei Fragen stellen",
          items: [
            "Welche WORTART fehlt? Verb, Konnektor, Präposition, Pronomen — das halbiert die Auswahl sofort.",
            "Was verlangt der SATZBAU? Steht das Verb am Ende, brauchst du eine Subjunktion (weil, obwohl, damit); steht es an Position 2, ein Adverb (deshalb, trotzdem).",
            "Was verlangt der SINN? Gegensatz, Grund, Folge, Zeit oder Bedingung — die Beziehung zwischen den beiden Sätzen entscheidet.",
          ],
        },
        {
          kind: "examples",
          items: [
            {
              de: "Er kam nicht, obwohl er es versprochen hatte.",
              note: "Subjunktion → Verb am Ende",
            },
            {
              de: "Er hatte es versprochen. Trotzdem kam er nicht.",
              note: "Adverb → Verb an Position 2",
            },
            {
              de: "Er hatte es versprochen, aber er kam nicht.",
              note: "Konjunktion → Verb an Position 2, kein Komma-Zwang im Nebensatz",
            },
          ],
        },
        {
          kind: "pitfall",
          body:
            "In Teil 2 wird jedes Wort der Liste nur EINMAL gebraucht. Wer " +
            "ein Wort doppelt einsetzt, verliert automatisch zwei Punkte. " +
            "Streiche jedes verwendete Wort durch.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "sb-ex-1",
      kind: "cloze",
      question: "Ergänze die Lücken — achte auf die Stellung des Verbs.",
      text:
        "Die Konferenz musste verschoben werden, {{1}} mehrere Referenten " +
        "erkrankt waren. Die Veranstalter hatten lange geplant; {{2}} blieb " +
        "ihnen keine andere Wahl. Der neue Termin wird bekannt gegeben, " +
        "{{3}} alle Zusagen vorliegen.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "weil" },
            { id: "b", text: "deshalb" },
            { id: "c", text: "denn" },
          ],
          answer: "a",
          explanation:
            "„waren“ steht am Satzende → es muss eine Subjunktion sein. " +
            "„deshalb“ und „denn“ verlangen beide das Verb an Position 2.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "obwohl" },
            { id: "b", text: "dennoch" },
            { id: "c", text: "damit" },
          ],
          answer: "b",
          explanation:
            "„blieb“ steht direkt hinter der Lücke, also an Position 2 → " +
            "Adverb. Inhaltlich liegt ein Gegensatz vor: „dennoch“.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "sobald" },
            { id: "b", text: "seitdem" },
            { id: "c", text: "bevor" },
          ],
          answer: "a",
          explanation:
            "Der Termin wird erst nach den Zusagen bekannt gegeben — " +
            "„sobald“ drückt genau diese Bedingung in der Zukunft aus.",
        },
      ],
    },
    {
      id: "sb-ex-2",
      kind: "choice",
      question:
        "Wie viele Punkte bringt ein einzelner richtiger Sprachbaustein?",
      options: [
        { id: "a", text: "1 Punkt" },
        { id: "b", text: "1,5 Punkte" },
        { id: "c", text: "2,5 Punkte" },
      ],
      answer: "b",
      explanation:
        "20 Lücken zu je 1,5 Punkten ergeben die 30 Punkte des " +
        "Prüfungsteils Sprachbausteine.",
    },
  ],
};

export const HOEREN_GUIDE: Lesson = {
  slug: "hoerverstehen",
  track: "pruefungsteile",
  title: "Hörverstehen",
  subtitle: "Einmal hören, sofort entscheiden — Zurückspulen gibt es nicht.",
  levels: ["B1", "B2"],
  minutes: 7,
  sections: [
    {
      id: "format",
      title: "Das Format",
      blocks: [
        formatTable("hoeren"),
        { kind: "text", body: scoreLine("hoeren") },
        {
          kind: "text",
          body:
            "Der entscheidende Unterschied zum Lesen: Die Aufnahme läuft " +
            "weiter. Auch im Simulator ist jede Aufnahme genau einmal " +
            "abspielbar, ohne Pause und ohne Zurückspulen — wie im " +
            "Prüfungszentrum.",
        },
      ],
    },
    {
      id: "strategie",
      title: "Vor, während und nach dem Hören",
      blocks: [
        {
          kind: "list",
          title: "Vor dem Abspielen",
          items: [
            "Die Aufgaben lesen und in jeder Frage zwei bis drei Schlüsselwörter markieren.",
            "Erwartungen bilden: Geht es um Zahlen, um eine Meinung, um eine Empfehlung?",
            "Die Reihenfolge einprägen — die Aufgaben folgen dem Ablauf der Aufnahme.",
          ],
        },
        {
          kind: "list",
          title: "Während des Hörens",
          items: [
            "Sofort entscheiden und weiterhören. Eine verpasste Aufgabe kostet einen Punkt, ein Grübeln kostet drei.",
            "Nicht mitschreiben, nur ankreuzen — Schreiben kostet Hörzeit.",
            "Bei Unsicherheit markieren und weiterhören, statt zurückzudenken.",
          ],
        },
        {
          kind: "pitfall",
          body:
            "Sprecher korrigieren sich oft: „Wir treffen uns um acht … nein, " +
            "warte, um neun geht es besser.“ Es gilt immer die LETZTE " +
            "Angabe. Genau darauf sind die Distraktoren gebaut.",
        },
        {
          kind: "tip",
          body:
            "Mach den Kopfhörer-Test („Audio-Check“) ernsthaft, bevor die " +
            "Session startet. Ein zu leiser Ton kostet dich 75 Punkte, die " +
            "nichts mit deinem Deutsch zu tun haben.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "hoeren-ex-1",
      kind: "choice",
      question:
        "In der Aufnahme sagt der Sprecher: „Der Kurs kostet 120 Euro — Entschuldigung, 140 Euro mit Material.“ Welche Zahl ist richtig?",
      options: [
        { id: "a", text: "120 Euro" },
        { id: "b", text: "140 Euro" },
        { id: "c", text: "Beide Angaben sind möglich." },
      ],
      answer: "b",
      explanation:
        "Bei Selbstkorrekturen gilt immer die letzte Angabe. Die erste Zahl " +
        "steht als Distraktor in den Antwortoptionen.",
    },
    {
      id: "hoeren-ex-2",
      kind: "choice",
      question:
        "Du verpasst Aufgabe 7, während die Aufnahme weiterläuft. Was tust du?",
      options: [
        { id: "a", text: "Zurückdenken und die Stelle rekonstruieren." },
        { id: "b", text: "Sofort zu Aufgabe 8 weitergehen und 7 später raten." },
        { id: "c", text: "Die Aufnahme pausieren." },
      ],
      answer: "b",
      explanation:
        "Weiterhören rettet die folgenden Aufgaben. Pausieren ist weder im " +
        "Prüfungszentrum noch im Simulator möglich.",
    },
  ],
};

export const SCHREIBEN_GUIDE: Lesson = {
  slug: "schriftlicher-ausdruck",
  track: "pruefungsteile",
  title: "Schriftlicher Ausdruck",
  subtitle: "Eine Aufgabe, 30 Minuten, drei Bewertungskriterien.",
  levels: ["B1", "B2"],
  minutes: 9,
  sections: [
    {
      id: "format",
      title: "Das Format",
      blocks: [
        formatTable("schreiben"),
        { kind: "text", body: scoreLine("schreiben") },
        {
          kind: "text",
          body:
            "Du wählst EINE der beiden Aufgaben — beide bringen dieselbe " +
            "Punktzahl. Im Simulator siehst du beide Aufgaben; gewertet " +
            "wird die Produktion, die du abgibst.",
        },
      ],
    },
    {
      id: "kriterien",
      title: "Die drei Bewertungskriterien",
      blocks: [
        {
          kind: "table",
          head: ["Kriterium", "Worauf geachtet wird"],
          rows: [
            [
              "Inhalt",
              "Alle vorgegebenen Leitpunkte behandelt, jeder davon ausgeführt statt nur erwähnt.",
            ],
            [
              "Kommunikative Gestaltung",
              "Textsorte getroffen (Brief, E-Mail, Forumsbeitrag), Anrede und Gruß korrekt, Absätze, Konnektoren, passendes Register.",
            ],
            [
              "Formale Richtigkeit",
              "Wortschatzbreite, Satzbau, Grammatik, Rechtschreibung.",
            ],
          ],
        },
        {
          kind: "text",
          body:
            "Das erste Kriterium ist das am leichtesten zu rettende: Wer " +
            "einen Leitpunkt vergisst, verliert Punkte, die kein perfekter " +
            "Satzbau zurückholt. Wer alle Leitpunkte abarbeitet, sichert " +
            "sich eine solide Grundwertung, auch mit Fehlern.",
        },
        {
          kind: "pitfall",
          body:
            "Ein Leitpunkt ist erst behandelt, wenn er ausgeführt ist. " +
            "„Zum Preis: Der Preis ist wichtig.“ zählt nicht. " +
            "„Zum Preis: 200 Euro übersteigen mein Budget, deshalb frage ich " +
            "nach einer Ratenzahlung.“ zählt.",
        },
      ],
    },
    {
      id: "zeitplan",
      title: "Die 30 Minuten einteilen",
      blocks: [
        {
          kind: "list",
          items: [
            "5 Minuten: Aufgabe wählen und Stichpunkte zu jedem Leitpunkt notieren.",
            "20 Minuten: schreiben, in Absätzen — ein Absatz pro Leitpunkt.",
            "5 Minuten: prüfen. Verbstellung, Groß-/Kleinschreibung, Endungen, Anrede und Gruß.",
          ],
        },
        {
          kind: "tip",
          body:
            "Beim Prüfen gezielt nach DEINEN Fehlern suchen, nicht " +
            "allgemein „lesen“. Die meisten Kandidatinnen und Kandidaten " +
            "haben zwei oder drei wiederkehrende Fehlertypen — kenne deine.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "schreiben-ex-1",
      kind: "choice",
      question:
        "Du hast wenig Zeit und drei von vier Leitpunkten sind ausgeführt. Was bringt mehr Punkte?",
      options: [
        {
          id: "a",
          text: "Die drei Absätze sprachlich verfeinern.",
        },
        {
          id: "b",
          text: "Den vierten Leitpunkt kurz, aber vollständig ausführen.",
        },
        { id: "c", text: "Einen längeren Schlusssatz schreiben." },
      ],
      answer: "b",
      explanation:
        "Ein fehlender Leitpunkt kostet im Kriterium Inhalt deutlich mehr, " +
        "als sprachliche Politur im Kriterium Formale Richtigkeit einbringt.",
    },
    {
      id: "schreiben-ex-2",
      kind: "choice",
      question:
        "Welche Grußformel passt zu einer formellen Beschwerde an ein Unternehmen?",
      options: [
        { id: "a", text: "Liebe Grüße" },
        { id: "b", text: "Mit freundlichen Grüßen" },
        { id: "c", text: "Bis bald" },
      ],
      answer: "b",
      explanation:
        "„Mit freundlichen Grüßen“ ist die neutrale formelle Grußformel. " +
        "Register-Brüche fallen im Kriterium Kommunikative Gestaltung auf.",
    },
    {
      id: "schreiben-ex-3",
      kind: "cloze",
      question: "Formelle E-Mail — wähle die passenden Wendungen.",
      text:
        "Sehr geehrte Damen und Herren,\n\n{{1}} auf Ihre Anzeige vom " +
        "3. Mai. {{2}} Sie mir mitteilen, ob der Kurs auch abends " +
        "stattfindet? Über eine baldige Antwort {{3}} ich mich sehr.\n\n" +
        "Mit freundlichen Grüßen",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "ich schreibe wegen" },
            { id: "b", text: "ich beziehe mich" },
            { id: "c", text: "ich rede über" },
          ],
          answer: "b",
          explanation:
            "„sich beziehen auf“ ist die formelle Standardwendung. " +
            "„schreiben wegen“ ist umgangssprachlich, „reden über“ falsch " +
            "im schriftlichen Register.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "Können" },
            { id: "b", text: "Könnten" },
            { id: "c", text: "Wollen" },
          ],
          answer: "b",
          explanation:
            "Der Konjunktiv II („Könnten Sie“) macht die Bitte höflich — " +
            "ein typisches Merkmal des formellen Registers auf B2-Niveau.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "freue" },
            { id: "b", text: "danke" },
            { id: "c", text: "warte" },
          ],
          answer: "a",
          explanation:
            "„sich über etwas freuen“ — feste Verbindung mit Präposition " +
            "„über“ und Reflexivpronomen „mich“.",
        },
      ],
    },
  ],
};

export const PRUEFUNGSTEIL_LESSONS: Lesson[] = [
  LESEN_GUIDE,
  SPRACHBAUSTEINE_GUIDE,
  HOEREN_GUIDE,
  SCHREIBEN_GUIDE,
];
