/**
 * Progression grammaticale B1 — les bases que le B2 présuppose.
 * Ordre volontaire : verbe (temps) → phrase (subordonnées) → groupe nominal
 * (déclinaison) → prépositions → modalité.
 */

import type { Lesson } from "../types";

const PERFEKT: Lesson = {
  slug: "b1-perfekt-und-praeteritum",
  track: "grammatik",
  title: "Perfekt und Präteritum",
  subtitle: "Welche Vergangenheit wann — gesprochen, geschrieben, mit haben oder sein.",
  levels: ["B1"],
  minutes: 8,
  sections: [
    {
      id: "gebrauch",
      title: "Wann welches Tempus?",
      blocks: [
        {
          kind: "table",
          head: ["Tempus", "Gebrauch", "Beispiel"],
          rows: [
            [
              "Perfekt",
              "Gesprochene Sprache, persönliche Mitteilung, E-Mail an Bekannte",
              "Ich habe gestern einen Kurs besucht.",
            ],
            [
              "Präteritum",
              "Geschriebene Texte, Berichte, Erzählungen",
              "Er besuchte den Kurs jeden Abend.",
            ],
            [
              "Präteritum (immer)",
              "sein, haben und die Modalverben — auch beim Sprechen",
              "Ich war müde. Ich hatte keine Zeit. Ich musste arbeiten.",
            ],
          ],
        },
        {
          kind: "tip",
          body:
            "Faustregel für die Prüfung: In einer persönlichen E-Mail " +
            "schreibst du Perfekt, aber „war“, „hatte“ und „musste“ bleiben " +
            "im Präteritum. „Ich habe müde gewesen“ gibt es nicht.",
        },
      ],
    },
    {
      id: "haben-sein",
      title: "haben oder sein?",
      blocks: [
        {
          kind: "list",
          title: "Mit sein stehen",
          items: [
            "Verben der Ortsveränderung: gehen, fahren, fliegen, kommen, laufen, reisen",
            "Verben der Zustandsänderung: aufstehen, einschlafen, aufwachen, sterben, wachsen",
            "Die drei Einzelfälle: sein, bleiben, werden",
          ],
        },
        {
          kind: "text",
          body:
            "Alle übrigen Verben bilden das Perfekt mit „haben“ — " +
            "insbesondere alle Verben mit Akkusativobjekt und alle " +
            "reflexiven Verben.",
        },
        {
          kind: "examples",
          items: [
            { de: "Ich bin nach Berlin gefahren.", note: "Ortsveränderung → sein" },
            { de: "Ich habe das Auto gefahren.", note: "mit Akkusativobjekt → haben" },
            { de: "Sie ist eingeschlafen.", note: "Zustandsänderung → sein" },
            { de: "Sie hat sich beeilt.", note: "reflexiv → immer haben" },
          ],
        },
      ],
    },
    {
      id: "partizip",
      title: "Das Partizip II bilden",
      blocks: [
        {
          kind: "table",
          head: ["Verbtyp", "Muster", "Beispiel"],
          rows: [
            ["regelmäßig", "ge- + Stamm + -t", "machen → gemacht"],
            ["unregelmäßig", "ge- + geänderter Stamm + -en", "sprechen → gesprochen"],
            ["trennbar", "Präfix + ge- + …", "einkaufen → eingekauft"],
            ["untrennbar (be-, er-, ver-, ent-, zer-)", "OHNE ge-", "verstehen → verstanden"],
            ["auf -ieren", "OHNE ge-", "studieren → studiert"],
          ],
        },
        {
          kind: "pitfall",
          body:
            "„gestudiert“ und „gebekommen“ sind die beiden häufigsten " +
            "Fehler: Verben auf -ieren und Verben mit untrennbarem Präfix " +
            "bekommen nie ein ge-.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "b1-perf-1",
      kind: "cloze",
      question: "Ergänze das Hilfsverb.",
      text:
        "Am Samstag {{1}} wir nach München gefahren. Dort {{2}} ich " +
        "meine alte Kollegin getroffen. Wir {{3}} lange spazieren gegangen.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "haben" },
            { id: "b", text: "sind" },
            { id: "c", text: "werden" },
          ],
          answer: "b",
          explanation: "„fahren“ ohne Akkusativobjekt = Ortsveränderung → sein.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "habe" },
            { id: "b", text: "bin" },
            { id: "c", text: "war" },
          ],
          answer: "a",
          explanation:
            "„treffen“ hat ein Akkusativobjekt („meine Kollegin“) → haben.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "haben" },
            { id: "b", text: "sind" },
            { id: "c", text: "hatten" },
          ],
          answer: "b",
          explanation:
            "„spazieren gehen“ ist Ortsveränderung → sein, trotz des " +
            "zusammengesetzten Ausdrucks.",
        },
      ],
    },
    {
      id: "b1-perf-2",
      kind: "choice",
      question: "Welcher Satz ist korrekt?",
      options: [
        { id: "a", text: "Ich habe letztes Jahr in Köln studiert." },
        { id: "b", text: "Ich habe letztes Jahr in Köln gestudiert." },
        { id: "c", text: "Ich bin letztes Jahr in Köln studiert." },
      ],
      answer: "a",
      explanation:
        "Verben auf -ieren bilden das Partizip ohne ge- („studiert“) und " +
        "stehen mit „haben“.",
    },
    {
      id: "b1-perf-3",
      kind: "choice",
      question: "Welche Form ist in einer gesprochenen Aussage üblich?",
      options: [
        { id: "a", text: "Ich habe gestern keine Zeit gehabt." },
        { id: "b", text: "Ich hatte gestern keine Zeit." },
        { id: "c", text: "Beide sind möglich, (b) ist üblicher." },
      ],
      answer: "c",
      explanation:
        "„haben“, „sein“ und die Modalverben stehen auch mündlich fast " +
        "immer im Präteritum. Das Perfekt ist nicht falsch, klingt aber " +
        "schwerfällig.",
    },
  ],
};

const NEBENSAETZE: Lesson = {
  slug: "b1-nebensaetze",
  track: "grammatik",
  title: "Nebensätze: weil, dass, wenn, obwohl",
  subtitle: "Das Verb wandert ans Ende — und der ganze Satzbau ändert sich.",
  levels: ["B1"],
  minutes: 8,
  sections: [
    {
      id: "grundregel",
      title: "Die Grundregel",
      blocks: [
        {
          kind: "text",
          body:
            "Nach einer Subjunktion (weil, dass, wenn, obwohl, damit, ob, " +
            "als, bevor, nachdem, seitdem, sobald, während) steht das " +
            "konjugierte Verb am ENDE des Nebensatzes. Hauptsatz und " +
            "Nebensatz werden immer durch ein Komma getrennt.",
        },
        {
          kind: "examples",
          items: [
            { de: "Ich bleibe zu Hause, weil ich krank bin." },
            { de: "Weil ich krank bin, bleibe ich zu Hause.", note: "Nebensatz zuerst → Verb-Komma-Verb" },
            { de: "Ich hoffe, dass du bald kommst." },
            { de: "Obwohl es regnete, gingen wir spazieren." },
          ],
        },
        {
          kind: "tip",
          body:
            "Steht der Nebensatz vorn, besetzt er Position 1 des Hauptsatzes. " +
            "Dann folgt sofort das Verb: „Weil ich krank bin, BLEIBE ich …“ " +
            "Das nennt man die Verb-Komma-Verb-Regel.",
        },
      ],
    },
    {
      id: "bedeutung",
      title: "Welche Subjunktion wofür?",
      blocks: [
        {
          kind: "table",
          head: ["Bedeutung", "Subjunktion", "Beispiel"],
          rows: [
            ["Grund", "weil, da", "Er kommt nicht, weil er arbeitet."],
            ["Gegensatz", "obwohl", "Er kommt, obwohl er arbeitet."],
            ["Bedingung", "wenn, falls", "Wenn er Zeit hat, kommt er."],
            ["Zweck", "damit / um … zu", "Ich rufe an, damit du Bescheid weißt."],
            ["Zeit (gleichzeitig)", "während, wenn, als", "Als ich klein war, wohnten wir in Bonn."],
            ["Zeit (vorher/nachher)", "bevor, nachdem", "Nachdem er gegessen hatte, ging er."],
            ["indirekte Frage", "ob, W-Wort", "Ich weiß nicht, ob er kommt."],
          ],
        },
        {
          kind: "pitfall",
          body:
            "„wenn“ oder „als“? „als“ steht für ein EINMALIGES Ereignis in " +
            "der Vergangenheit („Als ich 2019 nach Berlin zog …“), „wenn“ " +
            "für Wiederholungen und für die Gegenwart/Zukunft („Immer wenn " +
            "es regnet …“).",
        },
      ],
    },
    {
      id: "denn-weil",
      title: "denn ≠ weil",
      blocks: [
        {
          kind: "text",
          body:
            "„denn“ ist eine Konjunktion: das Verb bleibt an Position 2. " +
            "„weil“ ist eine Subjunktion: das Verb geht ans Ende. Beide " +
            "bedeuten dasselbe, aber der Satzbau ist verschieden — genau " +
            "das wird in den Sprachbausteinen geprüft.",
        },
        {
          kind: "examples",
          items: [
            { de: "Er kommt nicht, denn er ist krank.", note: "Verb an Position 2" },
            { de: "Er kommt nicht, weil er krank ist.", note: "Verb am Ende" },
          ],
        },
      ],
    },
  ],
  exercises: [
    {
      id: "b1-neben-1",
      kind: "choice",
      question: "Welcher Satz ist korrekt?",
      options: [
        { id: "a", text: "Ich komme später, weil ich habe noch einen Termin." },
        { id: "b", text: "Ich komme später, weil ich noch einen Termin habe." },
        { id: "c", text: "Ich komme später, weil habe ich noch einen Termin." },
      ],
      answer: "b",
      explanation:
        "Nach „weil“ steht das konjugierte Verb („habe“) am Satzende.",
    },
    {
      id: "b1-neben-2",
      kind: "choice",
      question: "„___ ich in Hamburg wohnte, fuhr ich jeden Tag mit dem Rad.“",
      options: [
        { id: "a", text: "Wenn" },
        { id: "b", text: "Als" },
        { id: "c", text: "Ob" },
      ],
      answer: "b",
      explanation:
        "Ein abgeschlossener Zeitraum in der Vergangenheit → „als“. „Wenn“ " +
        "wäre nur bei Wiederholung möglich, „ob“ leitet indirekte Fragen ein.",
    },
    {
      id: "b1-neben-3",
      kind: "cloze",
      question: "Ergänze die passende Verbindung.",
      text:
        "Sie nahm den späteren Zug, {{1}} sie ausschlafen konnte. " +
        "Sie kam trotzdem pünktlich an, {{2}} der Zug Verspätung hatte. " +
        "Ich frage mich, {{3}} sie das jeden Tag so macht.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "damit" },
            { id: "b", text: "weil" },
            { id: "c", text: "obwohl" },
          ],
          answer: "a",
          explanation:
            "Der Nebensatz nennt den ZWECK der Handlung → „damit“.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "weil" },
            { id: "b", text: "obwohl" },
            { id: "c", text: "wenn" },
          ],
          answer: "b",
          explanation:
            "Pünktlich TROTZ Verspätung — ein Gegensatz → „obwohl“.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "dass" },
            { id: "b", text: "ob" },
            { id: "c", text: "wenn" },
          ],
          answer: "b",
          explanation:
            "„sich fragen“ leitet eine indirekte Ja/Nein-Frage ein → „ob“.",
        },
      ],
    },
  ],
};

const ADJEKTIVE: Lesson = {
  slug: "b1-adjektivdeklination",
  track: "grammatik",
  title: "Adjektivdeklination",
  subtitle: "Eine Tabelle, drei Fälle — und die Regel, die alles vereinfacht.",
  levels: ["B1", "B2"],
  minutes: 9,
  sections: [
    {
      id: "prinzip",
      title: "Das Prinzip: einer muss das Signal tragen",
      blocks: [
        {
          kind: "text",
          body:
            "Kasus und Genus müssen genau einmal sichtbar sein. Zeigt der " +
            "Artikel sie schon („der“, „dem“, „die“), reicht dem Adjektiv " +
            "eine schwache Endung: -e oder -en. Fehlt der Artikel oder ist " +
            "er schwach („ein“, „mein“), übernimmt das Adjektiv das Signal " +
            "und bekommt die starke Endung des Artikels.",
        },
      ],
    },
    {
      id: "tabellen",
      title: "Die drei Tabellen",
      blocks: [
        {
          kind: "table",
          head: ["nach der/die/das", "m", "f", "n", "Plural"],
          rows: [
            ["Nominativ", "der gute Wein", "die gute Idee", "das gute Buch", "die guten Bücher"],
            ["Akkusativ", "den guten Wein", "die gute Idee", "das gute Buch", "die guten Bücher"],
            ["Dativ", "dem guten Wein", "der guten Idee", "dem guten Buch", "den guten Büchern"],
          ],
        },
        {
          kind: "table",
          head: ["nach ein/kein/mein", "m", "f", "n", "Plural"],
          rows: [
            ["Nominativ", "ein guter Wein", "eine gute Idee", "ein gutes Buch", "keine guten Bücher"],
            ["Akkusativ", "einen guten Wein", "eine gute Idee", "ein gutes Buch", "keine guten Bücher"],
            ["Dativ", "einem guten Wein", "einer guten Idee", "einem guten Buch", "keinen guten Büchern"],
          ],
        },
        {
          kind: "table",
          head: ["ohne Artikel", "m", "f", "n", "Plural"],
          rows: [
            ["Nominativ", "guter Wein", "gute Idee", "gutes Buch", "gute Bücher"],
            ["Akkusativ", "guten Wein", "gute Idee", "gutes Buch", "gute Bücher"],
            ["Dativ", "gutem Wein", "guter Idee", "gutem Buch", "guten Büchern"],
          ],
        },
        {
          kind: "tip",
          body:
            "Merke die zwei Abkürzungen: Im DATIV ist die Adjektivendung " +
            "nach Artikel immer -en. Im PLURAL mit Artikel ebenfalls immer " +
            "-en. Damit sind über die Hälfte aller Fälle erledigt.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "b1-adj-1",
      kind: "cloze",
      question: "Ergänze die Adjektivendungen.",
      text:
        "Wir suchen ein{{1}} ruhige Wohnung in einem zentral{{2}} Viertel. " +
        "Mit dem neu{{3}} Vertrag beginnt die Miete im Juli.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "e" },
            { id: "b", text: "en" },
            { id: "c", text: "er" },
          ],
          answer: "a",
          explanation:
            "„Wohnung“ ist feminin, Akkusativ: „eine ruhige Wohnung“ — die " +
            "Endung des Adjektivs ist -e.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "es" },
            { id: "b", text: "en" },
            { id: "c", text: "em" },
          ],
          answer: "b",
          explanation:
            "„in einem … Viertel“ = Dativ. Nach Artikel ist die " +
            "Dativendung immer -en.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "er" },
            { id: "b", text: "es" },
            { id: "c", text: "en" },
          ],
          answer: "c",
          explanation: "„mit dem …“ = Dativ nach bestimmtem Artikel → -en.",
        },
      ],
    },
    {
      id: "b1-adj-2",
      kind: "choice",
      question: "Welche Form ist korrekt?",
      options: [
        { id: "a", text: "Das ist ein guter Vorschlag." },
        { id: "b", text: "Das ist ein gute Vorschlag." },
        { id: "c", text: "Das ist ein guten Vorschlag." },
      ],
      answer: "a",
      explanation:
        "„ein“ zeigt weder Genus noch Kasus. Das Adjektiv übernimmt das " +
        "Signal des Maskulinum Nominativ: -er.",
    },
  ],
};

const PRAEPOSITIONEN: Lesson = {
  slug: "b1-wechselpraepositionen",
  track: "grammatik",
  title: "Präpositionen und Kasus",
  subtitle: "Wo oder wohin — und welche Präposition welchen Fall regiert.",
  levels: ["B1"],
  minutes: 7,
  sections: [
    {
      id: "fest",
      title: "Feste Fälle",
      blocks: [
        {
          kind: "table",
          head: ["Kasus", "Präpositionen"],
          rows: [
            ["immer Akkusativ", "durch, für, gegen, ohne, um, bis, entlang"],
            ["immer Dativ", "aus, bei, mit, nach, seit, von, zu, gegenüber, ab"],
            ["meist Genitiv", "während, wegen, trotz, statt, innerhalb, aufgrund"],
          ],
        },
      ],
    },
    {
      id: "wechsel",
      title: "Die neun Wechselpräpositionen",
      blocks: [
        {
          kind: "text",
          body:
            "an, auf, hinter, in, neben, über, unter, vor, zwischen — sie " +
            "stehen mit BEIDEN Fällen. Entscheidend ist nicht die " +
            "Präposition, sondern das Verb: Beschreibt es eine Bewegung " +
            "auf ein Ziel zu (wohin?), steht der Akkusativ. Beschreibt es " +
            "einen Ort oder eine Bewegung innerhalb eines Ortes (wo?), " +
            "steht der Dativ.",
        },
        {
          kind: "examples",
          items: [
            { de: "Ich hänge das Bild an die Wand.", note: "wohin? → Akkusativ" },
            { de: "Das Bild hängt an der Wand.", note: "wo? → Dativ" },
            { de: "Er geht in die Küche.", note: "wohin? → Akkusativ" },
            { de: "Er kocht in der Küche.", note: "wo? → Dativ" },
            { de: "Sie läuft im Park.", note: "wo? → Dativ, obwohl sie sich bewegt" },
          ],
        },
        {
          kind: "pitfall",
          body:
            "„Sie läuft im Park“ ist Dativ, obwohl Bewegung stattfindet: " +
            "Der Park ist nicht das Ziel, sondern der Rahmen. Frage immer " +
            "„wohin?“, nie „bewegt sich jemand?“.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "b1-praep-1",
      kind: "cloze",
      question: "Akkusativ oder Dativ?",
      text:
        "Stell die Tasche bitte auf {{1}} Tisch. Der Schlüssel liegt schon " +
        "auf {{2}} Tisch. Wir treffen uns um acht vor {{3}} Kino.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "den" },
            { id: "b", text: "dem" },
            { id: "c", text: "der" },
          ],
          answer: "a",
          explanation: "„stellen“ = Bewegung zum Ziel (wohin?) → Akkusativ.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "den" },
            { id: "b", text: "dem" },
            { id: "c", text: "des" },
          ],
          answer: "b",
          explanation: "„liegen“ = Ort (wo?) → Dativ.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "das" },
            { id: "b", text: "dem" },
            { id: "c", text: "des" },
          ],
          answer: "b",
          explanation: "Treffpunkt, keine Zielbewegung (wo?) → Dativ.",
        },
      ],
    },
    {
      id: "b1-praep-2",
      kind: "choice",
      question: "Welcher Satz ist korrekt?",
      options: [
        { id: "a", text: "Wegen dem Regen blieben wir zu Hause." },
        { id: "b", text: "Wegen des Regens blieben wir zu Hause." },
        { id: "c", text: "Wegen den Regen blieben wir zu Hause." },
      ],
      answer: "b",
      explanation:
        "„wegen“ regiert in der Standardsprache den Genitiv. Die " +
        "Dativvariante ist umgangssprachlich und in der Prüfung zu meiden.",
    },
  ],
};

const MODALVERBEN: Lesson = {
  slug: "b1-modalverben",
  track: "grammatik",
  title: "Modalverben",
  subtitle: "Sechs Verben, die den ganzen Satz umbauen — inklusive Verneinung.",
  levels: ["B1"],
  minutes: 7,
  sections: [
    {
      id: "bedeutung",
      title: "Bedeutung und Satzbau",
      blocks: [
        {
          kind: "table",
          head: ["Modalverb", "Bedeutung", "Beispiel"],
          rows: [
            ["können", "Fähigkeit, Möglichkeit", "Ich kann Auto fahren."],
            ["müssen", "Notwendigkeit", "Ich muss heute arbeiten."],
            ["dürfen", "Erlaubnis", "Hier darf man parken."],
            ["sollen", "Auftrag, Empfehlung", "Du sollst den Arzt anrufen."],
            ["wollen", "eigener Wille", "Sie will Medizin studieren."],
            ["möchten", "höflicher Wunsch", "Ich möchte einen Kaffee."],
          ],
        },
        {
          kind: "text",
          body:
            "Das Modalverb wird konjugiert und steht an Position 2; das " +
            "Vollverb steht im Infinitiv am Satzende — die sogenannte " +
            "Satzklammer.",
        },
        {
          kind: "examples",
          items: [
            { de: "Ich muss morgen früh zum Zahnarzt gehen." },
            { de: "Er konnte den Termin leider nicht wahrnehmen.", note: "Präteritum, ohne Umlaut" },
            { de: "Sie sagt, dass sie heute länger arbeiten muss.", note: "Nebensatz: Modalverb ganz am Ende" },
          ],
        },
      ],
    },
    {
      id: "verneinung",
      title: "Die Verneinung ändert die Bedeutung",
      blocks: [
        {
          kind: "table",
          head: ["Positiv", "Verneint", "Bedeutung der Verneinung"],
          rows: [
            ["Du musst kommen.", "Du musst nicht kommen.", "Es ist nicht nötig (aber erlaubt)."],
            ["Du darfst kommen.", "Du darfst nicht kommen.", "Es ist verboten."],
            ["Du sollst kommen.", "Du sollst nicht kommen.", "Jemand rät davon ab."],
          ],
        },
        {
          kind: "pitfall",
          body:
            "„Du musst nicht“ heißt NICHT „du darfst nicht“. Das Verbot " +
            "wird mit „nicht dürfen“ ausgedrückt. Dieser Unterschied wird " +
            "im Hörverstehen regelmäßig geprüft.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "b1-modal-1",
      kind: "choice",
      question: "„Im Lesesaal ___ man nicht telefonieren.“ — Es ist verboten.",
      options: [
        { id: "a", text: "muss" },
        { id: "b", text: "darf" },
        { id: "c", text: "soll" },
      ],
      answer: "b",
      explanation:
        "Ein Verbot wird mit „nicht dürfen“ ausgedrückt. „nicht müssen“ " +
        "würde bedeuten: es ist nicht nötig.",
    },
    {
      id: "b1-modal-2",
      kind: "choice",
      question: "Welcher Nebensatz ist korrekt?",
      options: [
        { id: "a", text: "…, weil ich morgen früh aufstehen muss." },
        { id: "b", text: "…, weil ich muss morgen früh aufstehen." },
        { id: "c", text: "…, weil ich morgen früh muss aufstehen." },
      ],
      answer: "a",
      explanation:
        "Im Nebensatz steht das konjugierte Verb ganz am Ende — also hinter " +
        "dem Infinitiv: „aufstehen muss“.",
    },
  ],
};

export const GRAMMATIK_B1_LESSONS: Lesson[] = [
  PERFEKT,
  NEBENSAETZE,
  ADJEKTIVE,
  PRAEPOSITIONEN,
  MODALVERBEN,
];
