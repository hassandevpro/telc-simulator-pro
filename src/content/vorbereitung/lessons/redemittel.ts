/**
 * Redemittel et vocabulaire — la matière première du Schreiben.
 * Contenu volontairement « prêt à l'emploi » : des blocs que le candidat
 * peut réutiliser tels quels le jour de l'examen.
 */

import type { Lesson } from "../types";

const BRIEF: Lesson = {
  slug: "redemittel-brief-und-mail",
  track: "redemittel",
  title: "Redemittel: Brief und E-Mail",
  subtitle: "Bausteine für Anfrage, Beschwerde und Entschuldigung.",
  levels: ["B1", "B2"],
  minutes: 9,
  sections: [
    {
      id: "anrede",
      title: "Anrede und Gruß",
      blocks: [
        {
          kind: "table",
          head: ["Situation", "Anrede", "Gruß"],
          rows: [
            [
              "Empfänger unbekannt",
              "Sehr geehrte Damen und Herren,",
              "Mit freundlichen Grüßen",
            ],
            [
              "Empfänger bekannt (formell)",
              "Sehr geehrte Frau Weber, / Sehr geehrter Herr Weber,",
              "Mit freundlichen Grüßen",
            ],
            [
              "Bekannte, Kolleginnen und Kollegen",
              "Liebe Frau Weber, / Hallo Sabine,",
              "Viele Grüße / Herzliche Grüße",
            ],
            ["Freunde", "Liebe Anna, / Hallo Tom,", "Liebe Grüße / Bis bald"],
          ],
        },
        {
          kind: "pitfall",
          body:
            "Nach der Anrede steht ein KOMMA, und das nächste Wort wird " +
            "kleingeschrieben (außer es ist ein Nomen oder „Ich“ am " +
            "Satzanfang): „Sehr geehrte Damen und Herren, ich schreibe " +
            "Ihnen …“",
        },
      ],
    },
    {
      id: "einleitung",
      title: "Einleitung — den Anlass nennen",
      blocks: [
        {
          kind: "list",
          items: [
            "Ich beziehe mich auf Ihr Schreiben vom 3. Mai.",
            "mit großem Interesse habe ich Ihre Anzeige gelesen.",
            "vielen Dank für Ihre schnelle Antwort.",
            "ich wende mich an Sie, weil …",
            "leider muss ich mich über … beschweren.",
            "ich möchte mich für … entschuldigen.",
          ],
        },
      ],
    },
    {
      id: "hauptteil",
      title: "Hauptteil — bitten, nachfragen, sich beschweren",
      blocks: [
        {
          kind: "list",
          title: "Höflich bitten und nachfragen",
          items: [
            "Könnten Sie mir bitte mitteilen, ob …",
            "Ich wäre Ihnen sehr dankbar, wenn Sie …",
            "Wäre es möglich, den Termin zu verschieben?",
            "Darüber hinaus interessiert mich, wie …",
            "Für weitere Auskünfte stehe ich Ihnen gern zur Verfügung.",
          ],
        },
        {
          kind: "list",
          title: "Sich beschweren, ohne unhöflich zu werden",
          items: [
            "Leider entsprach die Lieferung nicht meinen Erwartungen.",
            "Zu meinem Bedauern musste ich feststellen, dass …",
            "Ich bitte Sie daher, den Betrag zu erstatten.",
            "Sollte ich bis zum 20. Mai keine Antwort erhalten, werde ich …",
          ],
        },
        {
          kind: "list",
          title: "Sich entschuldigen und einen Vorschlag machen",
          items: [
            "Bitte entschuldigen Sie, dass ich mich erst jetzt melde.",
            "Es tut mir aufrichtig leid, dass …",
            "Als Ausgleich schlage ich vor, …",
            "Alternativ könnten wir uns auch nächste Woche treffen.",
          ],
        },
        {
          kind: "tip",
          body:
            "Ein Absatz pro Leitpunkt, und jeder Absatz beginnt mit einer " +
            "dieser Wendungen. So ist das Kriterium Kommunikative " +
            "Gestaltung fast automatisch erfüllt — und du siehst beim " +
            "Prüfen sofort, ob ein Leitpunkt fehlt.",
        },
      ],
    },
    {
      id: "schluss",
      title: "Schluss",
      blocks: [
        {
          kind: "list",
          items: [
            "Über eine baldige Antwort würde ich mich sehr freuen.",
            "Vielen Dank im Voraus für Ihre Mühe.",
            "Ich freue mich darauf, von Ihnen zu hören.",
            "Bitte teilen Sie mir Ihre Entscheidung bis zum 15. Juni mit.",
          ],
        },
      ],
    },
  ],
  exercises: [
    {
      id: "red-brief-1",
      kind: "choice",
      question:
        "Wie geht es nach „Sehr geehrte Damen und Herren,“ korrekt weiter?",
      options: [
        { id: "a", text: "Ich beziehe mich auf Ihre Anzeige." },
        { id: "b", text: "ich beziehe mich auf Ihre Anzeige." },
        { id: "c", text: "Beziehe ich mich auf Ihre Anzeige." },
      ],
      answer: "b",
      explanation:
        "Nach dem Komma der Anrede wird kleingeschrieben — außer bei " +
        "Nomen. „Ich“ ist hier kein Satzanfang im Sinne der Rechtschreibung.",
    },
    {
      id: "red-brief-2",
      kind: "choice",
      question:
        "Welche Wendung passt in eine formelle Beschwerde?",
      options: [
        { id: "a", text: "Ich bin echt sauer über Ihre Lieferung." },
        { id: "b", text: "Zu meinem Bedauern musste ich feststellen, dass die Lieferung unvollständig war." },
        { id: "c", text: "Das geht ja mal gar nicht." },
      ],
      answer: "b",
      explanation:
        "Register-Brüche werden im Kriterium Kommunikative Gestaltung " +
        "abgewertet. Eine Beschwerde bleibt sachlich und distanziert.",
    },
    {
      id: "red-brief-3",
      kind: "cloze",
      question: "Vervollständige den Schlussteil.",
      text:
        "Für weitere Auskünfte stehe ich Ihnen gern zur {{1}}. " +
        "Über eine baldige Antwort würde ich mich sehr {{2}}. " +
        "Vielen Dank im {{3}} für Ihre Mühe.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "Verfügung" },
            { id: "b", text: "Verwendung" },
            { id: "c", text: "Verabredung" },
          ],
          answer: "a",
          explanation:
            "„zur Verfügung stehen“ — feste Nomen-Verb-Verbindung.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "freuen" },
            { id: "b", text: "bedanken" },
            { id: "c", text: "interessieren" },
          ],
          answer: "a",
          explanation: "„sich über etwas freuen“ + Konjunktiv II für Höflichkeit.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "Vorher" },
            { id: "b", text: "Voraus" },
            { id: "c", text: "Vorfeld" },
          ],
          answer: "b",
          explanation: "„im Voraus“ — feste Wendung, immer großgeschrieben.",
        },
      ],
    },
  ],
};

const MEINUNG: Lesson = {
  slug: "redemittel-meinung-und-argumentation",
  track: "redemittel",
  title: "Redemittel: Meinung und Argumentation",
  subtitle: "Für Forumsbeiträge, Stellungnahmen und jede Pro-Contra-Aufgabe.",
  levels: ["B2"],
  minutes: 8,
  sections: [
    {
      id: "meinung",
      title: "Die eigene Meinung äußern",
      blocks: [
        {
          kind: "list",
          items: [
            "Meiner Ansicht nach …",
            "Ich bin der Überzeugung, dass …",
            "Aus meiner Sicht spricht vieles dafür, dass …",
            "Ich halte es für sinnvoll, dass …",
            "Es scheint mir wichtig, zwischen … und … zu unterscheiden.",
          ],
        },
        {
          kind: "pitfall",
          body:
            "„Meiner Meinung nach“ in jedem Absatz zu wiederholen, wirkt " +
            "arm. Variiere — die Wortschatzbreite fließt direkt in die " +
            "Bewertung ein.",
        },
      ],
    },
    {
      id: "argumentieren",
      title: "Argumentieren und abwägen",
      blocks: [
        {
          kind: "list",
          title: "Ein Argument einführen",
          items: [
            "Ein wichtiges Argument dafür ist, dass …",
            "Dafür spricht vor allem, dass …",
            "Hinzu kommt, dass …",
            "Nicht zuletzt sollte man bedenken, dass …",
          ],
        },
        {
          kind: "list",
          title: "Einschränken und widersprechen",
          items: [
            "Dagegen lässt sich einwenden, dass …",
            "Allerdings darf man nicht übersehen, dass …",
            "Das mag zwar zutreffen, dennoch …",
            "Im Gegensatz dazu steht die Tatsache, dass …",
          ],
        },
        {
          kind: "list",
          title: "Beispiele und Belege",
          items: [
            "Ein anschauliches Beispiel dafür ist …",
            "Das zeigt sich etwa daran, dass …",
            "Aus eigener Erfahrung kann ich sagen, dass …",
            "Studien belegen, dass …",
          ],
        },
        {
          kind: "list",
          title: "Abschließen",
          items: [
            "Abschließend lässt sich festhalten, dass …",
            "Alles in allem überwiegen für mich die Vorteile.",
            "Aus den genannten Gründen bin ich dafür, dass …",
            "Letztlich kommt es darauf an, ob …",
          ],
        },
        {
          kind: "tip",
          body:
            "Ein Aufbau, der immer funktioniert: These — Argument — " +
            "Beispiel — Gegenargument — Schlussfolgerung. Fünf Absätze, " +
            "je zwei bis drei Sätze, und die Aufgabe ist bewältigt.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "red-mein-1",
      kind: "choice",
      question:
        "Welche Wendung leitet ein GEGENargument ein?",
      options: [
        { id: "a", text: "Hinzu kommt, dass …" },
        { id: "b", text: "Dagegen lässt sich einwenden, dass …" },
        { id: "c", text: "Das zeigt sich etwa daran, dass …" },
      ],
      answer: "b",
      explanation:
        "„einwenden“ bedeutet widersprechen. (a) reiht ein weiteres " +
        "Argument an, (c) führt ein Beispiel ein.",
    },
    {
      id: "red-mein-2",
      kind: "cloze",
      question: "Ergänze die Redemittel eines Forumsbeitrags.",
      text:
        "Meiner {{1}} nach wird das Problem unterschätzt. Dafür {{2}} vor " +
        "allem die steigenden Zahlen. {{3}} lässt sich festhalten, dass " +
        "schnelles Handeln nötig ist.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "Ansicht" },
            { id: "b", text: "Gedanke" },
            { id: "c", text: "Idee" },
          ],
          answer: "a",
          explanation: "„meiner Ansicht nach“ — feste Wendung mit Dativ.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "spricht" },
            { id: "b", text: "sagt" },
            { id: "c", text: "redet" },
          ],
          answer: "a",
          explanation: "„für etwas sprechen“ = ein Argument sein.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "Anfangs" },
            { id: "b", text: "Abschließend" },
            { id: "c", text: "Dagegen" },
          ],
          answer: "b",
          explanation:
            "Der Satz zieht das Fazit → „Abschließend lässt sich " +
            "festhalten, dass …“",
        },
      ],
    },
  ],
};

const WORTSCHATZ: Lesson = {
  slug: "wortschatz-themenfelder",
  track: "redemittel",
  title: "Wortschatz nach Themenfeldern",
  subtitle: "Die Themen, die in telc-Aufgaben immer wiederkehren.",
  levels: ["B1", "B2"],
  minutes: 10,
  sections: [
    {
      id: "arbeit",
      title: "Arbeit und Beruf",
      blocks: [
        {
          kind: "table",
          head: ["Wort", "typische Verbindung"],
          rows: [
            ["die Stelle", "sich um eine Stelle bewerben, eine Stelle antreten"],
            ["die Bewerbung", "eine Bewerbung einreichen"],
            ["die Fortbildung", "an einer Fortbildung teilnehmen"],
            ["der Arbeitsvertrag", "einen Vertrag abschließen / kündigen"],
            ["die Work-Life-Balance", "Beruf und Familie vereinbaren"],
            ["das Homeoffice", "im Homeoffice arbeiten"],
            ["die Überstunde", "Überstunden machen / abbauen"],
          ],
        },
      ],
    },
    {
      id: "bildung",
      title: "Bildung und Studium",
      blocks: [
        {
          kind: "table",
          head: ["Wort", "typische Verbindung"],
          rows: [
            ["die Prüfung", "eine Prüfung ablegen / bestehen / wiederholen"],
            ["der Abschluss", "einen Abschluss erwerben"],
            ["das Stipendium", "ein Stipendium beantragen / erhalten"],
            ["die Kenntnisse", "Kenntnisse vertiefen / nachweisen"],
            ["das lebenslange Lernen", "sich ständig weiterbilden"],
          ],
        },
      ],
    },
    {
      id: "umwelt",
      title: "Umwelt und Verkehr",
      blocks: [
        {
          kind: "table",
          head: ["Wort", "typische Verbindung"],
          rows: [
            ["der Klimawandel", "den Klimawandel bekämpfen"],
            ["die Emissionen", "Emissionen senken / reduzieren"],
            ["die erneuerbaren Energien", "auf erneuerbare Energien umsteigen"],
            ["der öffentliche Nahverkehr", "den Nahverkehr ausbauen"],
            ["die Mülltrennung", "Müll trennen / vermeiden"],
            ["nachhaltig", "nachhaltig wirtschaften / leben"],
          ],
        },
      ],
    },
    {
      id: "gesundheit",
      title: "Gesundheit und Alltag",
      blocks: [
        {
          kind: "table",
          head: ["Wort", "typische Verbindung"],
          rows: [
            ["die Vorsorge", "zur Vorsorge gehen"],
            ["der Stress", "Stress abbauen / unter Stress stehen"],
            ["die Ernährung", "sich ausgewogen ernähren"],
            ["der Termin", "einen Termin vereinbaren / absagen / verschieben"],
            ["die Krankenkasse", "die Kosten übernehmen"],
          ],
        },
      ],
    },
    {
      id: "medien",
      title: "Medien und Digitalisierung",
      blocks: [
        {
          kind: "table",
          head: ["Wort", "typische Verbindung"],
          rows: [
            ["die sozialen Netzwerke", "in sozialen Netzwerken aktiv sein"],
            ["der Datenschutz", "Daten schützen / weitergeben"],
            ["die Quelle", "eine Quelle angeben / prüfen"],
            ["die Bildschirmzeit", "die Bildschirmzeit begrenzen"],
            ["die Digitalisierung", "Prozesse digitalisieren"],
          ],
        },
        {
          kind: "tip",
          body:
            "Lerne nie ein Nomen allein, sondern immer mit seinem Verb " +
            "(„einen Termin vereinbaren“). In den Sprachbausteinen Teil 2 " +
            "wird genau diese Verbindung abgefragt — das isolierte Wort " +
            "hilft dort nicht.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "wort-1",
      kind: "choice",
      question: "„einen Termin ___“ — welches Verb passt?",
      options: [
        { id: "a", text: "machen" },
        { id: "b", text: "vereinbaren" },
        { id: "c", text: "nehmen" },
      ],
      answer: "b",
      explanation:
        "„einen Termin vereinbaren“ ist die standardsprachliche " +
        "Verbindung. „machen“ ist mündlich möglich, in der schriftlichen " +
        "Prüfung aber schwach.",
    },
    {
      id: "wort-2",
      kind: "cloze",
      question: "Ergänze die passenden Verben.",
      text:
        "Er möchte sich um eine Stelle im Ausland {{1}}. Vorher muss er " +
        "noch seine Sprachkenntnisse {{2}}. Außerdem will er ein Stipendium " +
        "{{3}}.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "bewerben" },
            { id: "b", text: "melden" },
            { id: "c", text: "anmelden" },
          ],
          answer: "a",
          explanation: "„sich um eine Stelle bewerben“ — feste Verbindung.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "vertiefen" },
            { id: "b", text: "vergrößern" },
            { id: "c", text: "erhöhen" },
          ],
          answer: "a",
          explanation:
            "„Kenntnisse vertiefen“ ist die übliche Kollokation; " +
            "„vergrößern“ und „erhöhen“ passen zu Größen und Zahlen.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "beantragen" },
            { id: "b", text: "bestellen" },
            { id: "c", text: "verlangen" },
          ],
          answer: "a",
          explanation: "„ein Stipendium beantragen“ — Antrag stellen.",
        },
      ],
    },
  ],
};

export const REDEMITTEL_LESSONS: Lesson[] = [BRIEF, MEINUNG, WORTSCHATZ];
