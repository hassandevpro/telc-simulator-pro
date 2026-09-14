/**
 * Progression grammaticale B2 — ce que les Sprachbausteine testent
 * réellement et ce que le Schreiben attend.
 */

import type { Lesson } from "../types";

const KONNEKTOREN: Lesson = {
  slug: "b2-konnektoren",
  track: "grammatik",
  title: "Konnektoren",
  subtitle: "Die Nummer eins der Sprachbausteine: Bedeutung plus Satzstellung.",
  levels: ["B2"],
  minutes: 10,
  sections: [
    {
      id: "drei-klassen",
      title: "Drei Klassen, drei Satzstellungen",
      blocks: [
        {
          kind: "text",
          body:
            "Ein Konnektor wird nicht nur nach seiner Bedeutung gewählt, " +
            "sondern nach der Wortstellung, die er erzwingt. Wer die " +
            "Stellung des Verbs erkennt, hat zwei von drei Optionen " +
            "ausgeschlossen, bevor er über den Sinn nachdenkt.",
        },
        {
          kind: "table",
          head: ["Klasse", "Verbstellung", "Beispiele"],
          rows: [
            [
              "Konjunktion",
              "Verb an Position 2, Konnektor zählt nicht mit",
              "und, aber, denn, sondern, oder",
            ],
            [
              "Subjunktion",
              "Verb am ENDE des Nebensatzes",
              "weil, obwohl, damit, während, indem, sodass, falls, zumal",
            ],
            [
              "Adverb",
              "Verb direkt danach (Position 2)",
              "deshalb, trotzdem, dennoch, folglich, allerdings, hingegen",
            ],
          ],
        },
        {
          kind: "examples",
          items: [
            { de: "Die Kosten stiegen, weil das Material teurer wurde.", note: "Subjunktion → Verb am Ende" },
            { de: "Das Material wurde teurer, deshalb stiegen die Kosten.", note: "Adverb → Verb sofort danach" },
            { de: "Das Material wurde teurer, denn die Nachfrage war hoch.", note: "Konjunktion → normale Stellung" },
          ],
        },
      ],
    },
    {
      id: "bedeutungen",
      title: "Nach Bedeutung sortiert",
      blocks: [
        {
          kind: "table",
          head: ["Bedeutung", "Subjunktion", "Adverb"],
          rows: [
            ["Grund", "weil, da, zumal", "deshalb, daher, folglich"],
            ["Gegensatz", "obwohl, während", "trotzdem, dennoch, allerdings, hingegen"],
            ["Folge", "sodass", "also, infolgedessen"],
            ["Zweck", "damit, um … zu", "dazu, hierfür"],
            ["Bedingung", "wenn, falls, sofern", "andernfalls, sonst"],
            ["Art und Weise", "indem, dadurch dass", "so, auf diese Weise"],
            ["Einschränkung", "soweit, außer wenn", "immerhin, zumindest"],
          ],
        },
        {
          kind: "tip",
          body:
            "Zweiteilige Konnektoren bringen im Schreiben sichtbar Niveau: " +
            "„entweder … oder“, „weder … noch“, „zwar … aber“, „nicht nur " +
            "… sondern auch“, „je … desto“. Ein einziger gut gesetzter " +
            "„je …, desto …“-Satz wirkt stärker als drei „und“-Sätze.",
        },
        {
          kind: "examples",
          items: [
            { de: "Je früher man bucht, desto günstiger wird die Reise.", note: "je + Komparativ … desto + Komparativ, Verb am Ende / Position 2" },
            { de: "Sie spricht weder Französisch noch Spanisch." },
            { de: "Das Angebot ist zwar teuer, aber sehr umfangreich." },
          ],
        },
        {
          kind: "pitfall",
          body:
            "„trotzdem“ ist ein Adverb, „obwohl“ eine Subjunktion. " +
            "„Trotzdem er müde war“ ist falsch — richtig ist „Obwohl er " +
            "müde war“ oder „Er war müde, trotzdem arbeitete er weiter“.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "b2-konn-1",
      kind: "cloze",
      question: "Achte zuerst auf die Verbstellung, dann auf den Sinn.",
      text:
        "Das Unternehmen konnte den Auftrag annehmen, {{1}} es kurzfristig " +
        "zusätzliche Mitarbeiter einstellte. Die Lieferung verzögerte sich " +
        "dennoch; {{2}} entschuldigte sich die Geschäftsführung schriftlich. " +
        "{{3}} genauer geplant wird, desto seltener treten solche Probleme auf.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "indem" },
            { id: "b", text: "dadurch" },
            { id: "c", text: "deswegen" },
          ],
          answer: "a",
          explanation:
            "„einstellte“ steht am Ende → Subjunktion. „indem“ nennt das " +
            "MITTEL: Wie konnte es den Auftrag annehmen?",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "obwohl" },
            { id: "b", text: "daraufhin" },
            { id: "c", text: "damit" },
          ],
          answer: "b",
          explanation:
            "„entschuldigte“ folgt direkt → Adverb. „daraufhin“ drückt die " +
            "zeitliche Folge aus.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "Wenn" },
            { id: "b", text: "Je" },
            { id: "c", text: "Umso" },
          ],
          answer: "b",
          explanation:
            "Das „desto“ im zweiten Teil verlangt zwingend ein „je“ im " +
            "ersten: je + Komparativ …, desto + Komparativ …",
        },
      ],
    },
    {
      id: "b2-konn-2",
      kind: "choice",
      question: "Welcher Satz ist korrekt?",
      options: [
        { id: "a", text: "Trotzdem das Wetter schlecht war, fand das Fest statt." },
        { id: "b", text: "Obwohl das Wetter schlecht war, fand das Fest statt." },
        { id: "c", text: "Obwohl war das Wetter schlecht, fand das Fest statt." },
      ],
      answer: "b",
      explanation:
        "„obwohl“ ist die Subjunktion (Verb am Ende: „schlecht war“). " +
        "„trotzdem“ kann keinen Nebensatz einleiten.",
    },
    {
      id: "b2-konn-3",
      kind: "choice",
      question:
        "„Die Preise sind gestiegen, ___ die Nachfrage unverändert hoch bleibt.“",
      options: [
        { id: "a", text: "während" },
        { id: "b", text: "trotzdem" },
        { id: "c", text: "deshalb" },
      ],
      answer: "a",
      explanation:
        "„bleibt“ steht am Ende → Subjunktion nötig. „während“ drückt hier " +
        "den Gegensatz zwischen zwei gleichzeitigen Sachverhalten aus.",
    },
  ],
};

const PASSIV: Lesson = {
  slug: "b2-passiv",
  track: "grammatik",
  title: "Passiv",
  subtitle: "Der Stil der Sachtexte — und die Ersatzformen, die B2 erwartet.",
  levels: ["B2"],
  minutes: 9,
  sections: [
    {
      id: "formen",
      title: "Vorgangspassiv bilden",
      blocks: [
        {
          kind: "text",
          body:
            "werden (konjugiert) + Partizip II. Das Akkusativobjekt des " +
            "Aktivsatzes wird zum Subjekt; der Urheber wird mit „von“ " +
            "(Person) oder „durch“ (Mittel) angeschlossen — oder, weit " +
            "häufiger, weggelassen.",
        },
        {
          kind: "table",
          head: ["Tempus", "Form", "Beispiel"],
          rows: [
            ["Präsens", "wird + P II", "Der Vertrag wird geprüft."],
            ["Präteritum", "wurde + P II", "Der Vertrag wurde geprüft."],
            ["Perfekt", "ist + P II + worden", "Der Vertrag ist geprüft worden."],
            ["Plusquamperfekt", "war + P II + worden", "Der Vertrag war geprüft worden."],
            ["mit Modalverb", "muss + P II + werden", "Der Vertrag muss geprüft werden."],
          ],
        },
        {
          kind: "pitfall",
          body:
            "Im Perfekt Passiv heißt es „worden“, nicht „geworden“. " +
            "„Der Antrag ist genehmigt geworden“ ist falsch; richtig: " +
            "„… ist genehmigt worden“.",
        },
      ],
    },
    {
      id: "zustandspassiv",
      title: "Vorgang oder Zustand?",
      blocks: [
        {
          kind: "examples",
          items: [
            { de: "Das Geschäft wird um 20 Uhr geschlossen.", note: "Vorgang — es passiert gerade" },
            { de: "Das Geschäft ist seit 20 Uhr geschlossen.", note: "Zustand — Ergebnis (sein + P II)" },
          ],
        },
      ],
    },
    {
      id: "ersatzformen",
      title: "Passiversatzformen",
      blocks: [
        {
          kind: "text",
          body:
            "Auf B2-Niveau wird erwartet, dass du das Passiv auch umgehen " +
            "kannst. Diese Formen bedeuten ungefähr „kann/muss gemacht " +
            "werden“ und erscheinen regelmäßig in den Sprachbausteinen.",
        },
        {
          kind: "table",
          head: ["Ersatzform", "Bedeutung", "Beispiel"],
          rows: [
            ["sich lassen + Infinitiv", "kann … werden", "Das Problem lässt sich lösen."],
            ["sein + zu + Infinitiv", "muss/kann … werden", "Die Unterlagen sind bis Freitag einzureichen."],
            ["Adjektiv auf -bar", "kann … werden", "Der Termin ist verschiebbar."],
            ["man + Aktiv", "neutral, mündlich", "Man kann das Problem lösen."],
          ],
        },
        {
          kind: "tip",
          body:
            "Im Schreiben wirkt ein sparsam gesetztes Passiv sachlich und " +
            "erwachsen. Aber nicht jeder Satz braucht es: Drei " +
            "Passivsätze hintereinander lesen sich schwerfällig.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "b2-passiv-1",
      kind: "choice",
      question: "Setze ins Perfekt Passiv: „Man hat die Anträge geprüft.“",
      options: [
        { id: "a", text: "Die Anträge sind geprüft geworden." },
        { id: "b", text: "Die Anträge sind geprüft worden." },
        { id: "c", text: "Die Anträge haben geprüft worden." },
      ],
      answer: "b",
      explanation:
        "Perfekt Passiv = sein + Partizip II + „worden“ (nie „geworden“).",
    },
    {
      id: "b2-passiv-2",
      kind: "choice",
      question: "„Die Rechnung ist sofort zu bezahlen.“ Was bedeutet der Satz?",
      options: [
        { id: "a", text: "Die Rechnung kann bezahlt werden." },
        { id: "b", text: "Die Rechnung muss sofort bezahlt werden." },
        { id: "c", text: "Die Rechnung wurde bereits bezahlt." },
      ],
      answer: "b",
      explanation:
        "„sein + zu + Infinitiv“ drückt meist eine Notwendigkeit aus — " +
        "hier verstärkt durch „sofort“.",
    },
    {
      id: "b2-passiv-3",
      kind: "cloze",
      question: "Ergänze die Passivformen.",
      text:
        "Das Gebäude {{1}} im vergangenen Jahr vollständig saniert. " +
        "Die Arbeiten {{2}} von einem örtlichen Betrieb ausgeführt worden. " +
        "Der Zugang {{3}} sich nur über den Hof erreichen.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "wurde" },
            { id: "b", text: "war" },
            { id: "c", text: "hat" },
          ],
          answer: "a",
          explanation: "Vorgangspassiv Präteritum: wurde + Partizip II.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "haben" },
            { id: "b", text: "sind" },
            { id: "c", text: "werden" },
          ],
          answer: "b",
          explanation:
            "Das „worden“ am Ende verlangt das Perfekt Passiv mit „sein“.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "lässt" },
            { id: "b", text: "ist" },
            { id: "c", text: "wird" },
          ],
          answer: "a",
          explanation:
            "„sich lassen + Infinitiv“ — die Ersatzform für „kann erreicht " +
            "werden“.",
        },
      ],
    },
  ],
};

const KONJUNKTIV: Lesson = {
  slug: "b2-konjunktiv-2",
  track: "grammatik",
  title: "Konjunktiv II",
  subtitle: "Höflichkeit, Irrealität, Ratschlag — drei Funktionen, eine Form.",
  levels: ["B2"],
  minutes: 9,
  sections: [
    {
      id: "formen",
      title: "Die Formen",
      blocks: [
        {
          kind: "table",
          head: ["Verb", "Konjunktiv II", "Gebrauch"],
          rows: [
            ["sein", "wäre", "immer die echte Form"],
            ["haben", "hätte", "immer die echte Form"],
            ["werden", "würde", "Hilfsverb für alle übrigen Verben"],
            ["können", "könnte", "echte Form"],
            ["müssen", "müsste", "echte Form"],
            ["dürfen", "dürfte", "echte Form"],
            ["mögen", "möchte", "echte Form"],
            ["wissen", "wüsste", "echte Form"],
            ["gehen", "würde gehen", "Umschreibung mit würde"],
          ],
        },
        {
          kind: "text",
          body:
            "Regel: sein, haben, werden, die Modalverben und wenige starke " +
            "Verben (wüsste, käme, gäbe, bräuchte) bilden eine eigene Form. " +
            "Alle anderen Verben werden mit „würde + Infinitiv“ umschrieben.",
        },
        {
          kind: "pitfall",
          body:
            "„Wenn ich Zeit hätte“ — nicht „Wenn ich Zeit haben würde“. " +
            "Bei haben, sein und den Modalverben gilt die echte Form; die " +
            "würde-Umschreibung wirkt dort fehlerhaft.",
        },
      ],
    },
    {
      id: "funktionen",
      title: "Drei Funktionen",
      blocks: [
        {
          kind: "examples",
          items: [
            { de: "Könnten Sie mir bitte helfen?", note: "Höflichkeit — der Standard in der formellen E-Mail" },
            { de: "Wenn ich mehr Zeit hätte, würde ich einen Kurs besuchen.", note: "Irrealität Gegenwart" },
            { de: "An deiner Stelle würde ich früher anreisen.", note: "Ratschlag" },
            { de: "Es wäre schön, wenn Sie mir bald antworten könnten.", note: "höfliche Bitte, sehr prüfungstauglich" },
          ],
        },
      ],
    },
    {
      id: "vergangenheit",
      title: "Irrealität in der Vergangenheit",
      blocks: [
        {
          kind: "text",
          body:
            "Es gibt nur EINE Vergangenheitsform: hätte/wäre + Partizip II. " +
            "Mit Modalverb steht der doppelte Infinitiv am Ende.",
        },
        {
          kind: "examples",
          items: [
            { de: "Wenn ich das gewusst hätte, wäre ich früher gekommen." },
            { de: "Ich hätte den Termin absagen müssen.", note: "doppelter Infinitiv" },
            { de: "Beinahe wäre der Zug ohne uns abgefahren." },
          ],
        },
      ],
    },
  ],
  exercises: [
    {
      id: "b2-konj-1",
      kind: "choice",
      question: "Welche Bitte ist am höflichsten und formal korrekt?",
      options: [
        { id: "a", text: "Können Sie mir den Termin bestätigen?" },
        { id: "b", text: "Könnten Sie mir den Termin bestätigen?" },
        { id: "c", text: "Würden Sie mir den Termin bestätigen können?" },
      ],
      answer: "b",
      explanation:
        "„könnten“ ist die echte Konjunktiv-II-Form des Modalverbs. Die " +
        "würde-Umschreibung ist bei Modalverben unüblich und wirkt " +
        "schwerfällig.",
    },
    {
      id: "b2-konj-2",
      kind: "cloze",
      question: "Ergänze den Konjunktiv II.",
      text:
        "Wenn ich damals besser Deutsch gesprochen {{1}}, {{2}} ich die " +
        "Stelle bekommen. Heute {{3}} ich jedem raten, früher mit dem " +
        "Kurs zu beginnen.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "hätte" },
            { id: "b", text: "wäre" },
            { id: "c", text: "würde" },
          ],
          answer: "a",
          explanation:
            "„sprechen“ bildet das Perfekt mit „haben“ → Irrealis der " +
            "Vergangenheit: „gesprochen hätte“.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "hätte" },
            { id: "b", text: "wäre" },
            { id: "c", text: "würde" },
          ],
          answer: "a",
          explanation:
            "„bekommen“ steht ebenfalls mit „haben“: „hätte ich … bekommen“.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "würde" },
            { id: "b", text: "wäre" },
            { id: "c", text: "hätte" },
          ],
          answer: "a",
          explanation:
            "„raten“ hat keine gebräuchliche eigene Konjunktivform → " +
            "Umschreibung mit „würde“.",
        },
      ],
    },
  ],
};

const RELATIVSAETZE: Lesson = {
  slug: "b2-relativsaetze",
  track: "grammatik",
  title: "Relativsätze",
  subtitle: "Genus vom Bezugswort, Kasus vom Relativsatz — nie umgekehrt.",
  levels: ["B2"],
  minutes: 8,
  sections: [
    {
      id: "regel",
      title: "Die doppelte Regel",
      blocks: [
        {
          kind: "text",
          body:
            "Das Relativpronomen übernimmt GENUS und NUMERUS vom " +
            "Bezugswort, aber seinen KASUS von der Funktion im " +
            "Relativsatz. Diese Trennung ist der ganze Trick — und die " +
            "Fehlerquelle Nummer eins.",
        },
        {
          kind: "table",
          head: ["Kasus", "m", "f", "n", "Plural"],
          rows: [
            ["Nominativ", "der", "die", "das", "die"],
            ["Akkusativ", "den", "die", "das", "die"],
            ["Dativ", "dem", "der", "dem", "denen"],
            ["Genitiv", "dessen", "deren", "dessen", "deren"],
          ],
        },
        {
          kind: "examples",
          items: [
            { de: "Der Kollege, der neben mir sitzt, ist neu.", note: "Subjekt → Nominativ" },
            { de: "Der Kollege, den ich gestern traf, ist neu.", note: "Akkusativobjekt → den" },
            { de: "Der Kollege, dem ich geholfen habe, ist neu.", note: "Dativobjekt → dem" },
            { de: "Der Kollege, dessen Büro nebenan liegt, ist neu.", note: "Besitz → Genitiv" },
            { de: "Die Kollegen, denen ich geschrieben habe, antworten heute.", note: "Plural Dativ → denen" },
          ],
        },
      ],
    },
    {
      id: "praeposition",
      title: "Mit Präposition und mit was/wo-",
      blocks: [
        {
          kind: "text",
          body:
            "Verlangt das Verb im Relativsatz eine Präposition, steht sie " +
            "VOR dem Relativpronomen und bestimmt den Kasus.",
        },
        {
          kind: "examples",
          items: [
            { de: "Das Projekt, an dem wir arbeiten, endet im Mai.", note: "arbeiten an + Dativ" },
            { de: "Die Frage, auf die niemand antwortet, bleibt offen.", note: "antworten auf + Akkusativ" },
            { de: "Alles, was er sagte, war richtig.", note: "nach alles, etwas, nichts, das → was" },
            { de: "Die Stadt, wo ich aufgewachsen bin, hat sich verändert.", note: "Ort → wo (oder: in der)" },
          ],
        },
        {
          kind: "pitfall",
          body:
            "Nach „alles“, „etwas“, „nichts“, „vieles“ und nach einem " +
            "ganzen Satz steht „was“, nicht „das“: „Er kam zu spät, was " +
            "alle ärgerte.“",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "b2-rel-1",
      kind: "cloze",
      question: "Ergänze die Relativpronomen.",
      text:
        "Das ist die Kollegin, {{1}} ich die Unterlagen geschickt habe. " +
        "Der Bericht, {{2}} sie verfasst hat, wurde gelobt. " +
        "Das Unternehmen, {{3}} Zentrale in Hamburg liegt, expandiert.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "die" },
            { id: "b", text: "der" },
            { id: "c", text: "deren" },
          ],
          answer: "b",
          explanation:
            "„schicken“ verlangt ein Dativobjekt; feminin Dativ → „der“. " +
            "Das Genus kommt vom Bezugswort „Kollegin“.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "der" },
            { id: "b", text: "den" },
            { id: "c", text: "dem" },
          ],
          answer: "b",
          explanation:
            "„verfassen“ verlangt ein Akkusativobjekt; maskulin Akkusativ → " +
            "„den“.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "dessen" },
            { id: "b", text: "deren" },
            { id: "c", text: "das" },
          ],
          answer: "a",
          explanation:
            "Besitzverhältnis (die Zentrale DES Unternehmens); Neutrum " +
            "Genitiv → „dessen“.",
        },
      ],
    },
    {
      id: "b2-rel-2",
      kind: "choice",
      question: "„Er hat die Prüfung bestanden, ___ uns alle gefreut hat.“",
      options: [
        { id: "a", text: "das" },
        { id: "b", text: "was" },
        { id: "c", text: "die" },
      ],
      answer: "b",
      explanation:
        "Das Relativpronomen bezieht sich auf den ganzen vorangehenden " +
        "Satz — dann steht immer „was“.",
    },
  ],
};

const N_DEKLINATION: Lesson = {
  slug: "b2-n-deklination",
  track: "grammatik",
  title: "N-Deklination",
  subtitle: "Die kleine Endung, die in jedem Korrekturdurchgang auffällt.",
  levels: ["B2"],
  minutes: 6,
  sections: [
    {
      id: "wer",
      title: "Welche Nomen betrifft es?",
      blocks: [
        {
          kind: "text",
          body:
            "Bestimmte MASKULINE Nomen bekommen in allen Fällen außer dem " +
            "Nominativ Singular die Endung -n oder -en. Es sind fast " +
            "ausschließlich Personenbezeichnungen.",
        },
        {
          kind: "table",
          head: ["Gruppe", "Beispiele"],
          rows: [
            ["auf -e (belebt)", "der Kollege, der Kunde, der Junge, der Experte, der Zeuge"],
            ["auf -ent, -ant, -ist, -oge, -at", "der Student, der Praktikant, der Journalist, der Biologe, der Kandidat"],
            ["Nationalitäten auf -e", "der Franzose, der Grieche, der Türke"],
            ["Einzelfälle", "der Mensch, der Herr, der Nachbar, der Bauer"],
            ["mit -ns im Genitiv", "der Name → des Namens, der Gedanke → des Gedankens"],
          ],
        },
        {
          kind: "examples",
          items: [
            { de: "Der Kunde wartet.", note: "Nominativ — keine Endung" },
            { de: "Ich rufe den Kunden an.", note: "Akkusativ" },
            { de: "Ich helfe dem Kunden.", note: "Dativ" },
            { de: "die Anfrage des Kunden", note: "Genitiv" },
            { de: "Sehr geehrter Herr Weber / Sehr geehrte Herren", note: "„Herr“ wird ebenfalls dekliniert: an Herrn Weber" },
          ],
        },
        {
          kind: "pitfall",
          body:
            "„Ich habe mit einem Kollege gesprochen“ ist falsch — richtig: " +
            "„mit einem KollegeN“. Diese Endung kostet im Schreiben " +
            "regelmäßig Punkte im Kriterium Formale Richtigkeit.",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "b2-ndek-1",
      kind: "choice",
      question: "Welcher Satz ist korrekt?",
      options: [
        { id: "a", text: "Ich habe dem Praktikant die Aufgabe erklärt." },
        { id: "b", text: "Ich habe dem Praktikanten die Aufgabe erklärt." },
        { id: "c", text: "Ich habe den Praktikant die Aufgabe erklärt." },
      ],
      answer: "b",
      explanation:
        "„der Praktikant“ gehört zur N-Deklination: im Dativ „dem " +
        "Praktikanten“.",
    },
    {
      id: "b2-ndek-2",
      kind: "cloze",
      question: "Ergänze die Endungen (oder lass sie weg).",
      text:
        "Der Journalist{{1}} interviewte den Experte{{2}}. " +
        "Die Antwort des Nachbar{{3}} überraschte alle.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "—" },
            { id: "b", text: "en" },
            { id: "c", text: "s" },
          ],
          answer: "a",
          explanation:
            "Nominativ Singular — die einzige Form ohne Endung.",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "—" },
            { id: "b", text: "n" },
            { id: "c", text: "s" },
          ],
          answer: "b",
          explanation: "Akkusativ: „den Experten“.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "s" },
            { id: "b", text: "n" },
            { id: "c", text: "ns" },
          ],
          answer: "b",
          explanation:
            "„der Nachbar“ folgt der N-Deklination: Genitiv „des Nachbarn“, " +
            "nicht „des Nachbars“.",
        },
      ],
    },
  ],
};

const NOMEN_VERB: Lesson = {
  slug: "b2-nomen-verb-verbindungen",
  track: "grammatik",
  title: "Nomen-Verb-Verbindungen und Verben mit Präposition",
  subtitle: "Feste Kombinationen, die man nicht ableiten, nur lernen kann.",
  levels: ["B2"],
  minutes: 8,
  sections: [
    {
      id: "nomen-verb",
      title: "Nomen-Verb-Verbindungen",
      blocks: [
        {
          kind: "text",
          body:
            "Diese Wendungen ersetzen ein einfaches Verb und geben einem " +
            "Text sofort ein formelleres Register. In den Sprachbausteinen " +
            "wird meist das Verb abgefragt, nie das Nomen.",
        },
        {
          kind: "table",
          head: ["Wendung", "einfaches Verb"],
          rows: [
            ["eine Entscheidung treffen", "entscheiden"],
            ["einen Antrag stellen", "beantragen"],
            ["Rücksicht nehmen (auf)", "berücksichtigen"],
            ["in Frage stellen", "bezweifeln"],
            ["zur Verfügung stehen/stellen", "verfügbar sein/machen"],
            ["Kritik üben (an)", "kritisieren"],
            ["Bescheid geben", "informieren"],
            ["eine Rolle spielen", "wichtig sein"],
            ["zum Ausdruck bringen", "ausdrücken"],
            ["in Anspruch nehmen", "nutzen"],
          ],
        },
      ],
    },
    {
      id: "verb-praep",
      title: "Verben mit fester Präposition",
      blocks: [
        {
          kind: "table",
          head: ["Verb + Präposition", "Kasus", "Beispiel"],
          rows: [
            ["sich interessieren für", "Akkusativ", "Ich interessiere mich für den Kurs."],
            ["sich freuen auf / über", "Akkusativ", "Ich freue mich auf den Urlaub / über das Geschenk."],
            ["sich bewerben um / bei", "Akk. / Dat.", "Sie bewirbt sich um die Stelle bei einer Bank."],
            ["achten auf", "Akkusativ", "Achten Sie auf die Frist."],
            ["teilnehmen an", "Dativ", "Er nimmt an der Sitzung teil."],
            ["sich beziehen auf", "Akkusativ", "Ich beziehe mich auf Ihr Schreiben."],
            ["bestehen aus / auf", "Dativ / Dativ", "Das Team besteht aus vier Personen."],
            ["hinweisen auf", "Akkusativ", "Er wies auf das Problem hin."],
            ["sich handeln um", "Akkusativ", "Es handelt sich um einen Irrtum."],
          ],
        },
        {
          kind: "tip",
          body:
            "„sich freuen AUF“ = Zukunft, „sich freuen ÜBER“ = Gegenwart " +
            "oder Vergangenheit. Dieser Unterschied taucht in fast jedem " +
            "Modelltest auf.",
        },
        {
          kind: "text",
          body:
            "Bezieht sich die Präposition auf einen ganzen Nebensatz, " +
            "steht ein Präpositionaladverb: darauf, darüber, damit, " +
            "dafür — „Ich freue mich darauf, Sie kennenzulernen.“",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "b2-nv-1",
      kind: "cloze",
      question: "Ergänze die feste Präposition.",
      text:
        "Ich bewerbe mich {{1}} die ausgeschriebene Stelle und beziehe mich " +
        "{{2}} Ihr Inserat vom 12. März. Gern nehme ich auch {{3}} dem " +
        "Auswahlgespräch teil.",
      gaps: [
        {
          index: 1,
          options: [
            { id: "a", text: "um" },
            { id: "b", text: "für" },
            { id: "c", text: "auf" },
          ],
          answer: "a",
          explanation: "„sich bewerben um“ + Akkusativ (die Stelle).",
        },
        {
          index: 2,
          options: [
            { id: "a", text: "an" },
            { id: "b", text: "auf" },
            { id: "c", text: "über" },
          ],
          answer: "b",
          explanation: "„sich beziehen auf“ + Akkusativ.",
        },
        {
          index: 3,
          options: [
            { id: "a", text: "an" },
            { id: "b", text: "auf" },
            { id: "c", text: "in" },
          ],
          answer: "a",
          explanation: "„teilnehmen an“ + Dativ (dem Gespräch).",
        },
      ],
    },
    {
      id: "b2-nv-2",
      kind: "choice",
      question: "Welches Verb passt: „eine Entscheidung ___“?",
      options: [
        { id: "a", text: "machen" },
        { id: "b", text: "treffen" },
        { id: "c", text: "nehmen" },
      ],
      answer: "b",
      explanation:
        "„eine Entscheidung treffen“ ist die feste Verbindung. „machen“ " +
        "ist ein typischer Interferenzfehler aus dem Englischen und " +
        "Französischen.",
    },
  ],
};

export const GRAMMATIK_B2_LESSONS: Lesson[] = [
  KONNEKTOREN,
  PASSIV,
  KONJUNKTIV,
  RELATIVSAETZE,
  N_DEKLINATION,
  NOMEN_VERB,
];
