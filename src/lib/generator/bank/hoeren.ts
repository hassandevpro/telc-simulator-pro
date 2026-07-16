/**
 * BANQUE Hören — scripts ORIGINAUX + questions cohérentes, niveau B2.
 * Chaque set porte le texte parlé (script), les locuteurs et une durée cible
 * (matière pour la synthèse ElevenLabs), ainsi que les questions qui portent
 * sur ce script. Teil 1 & 3 : QCM à 3 options. Teil 2 : Richtig/Falsch.
 *
 * Rien n'est repris d'un examen officiel : dialogues, interviews et annonces
 * sont écrits pour ce projet.
 */
import type { McQuestionSeed } from "./lesen-teil-2";

export interface HoerenScriptSeed {
  text: string;
  speakers: string[];
  targetSeconds: number;
}

/** Teil 1 & 3 : script + QCM (3 options). */
export interface HoerenMcSet {
  theme: string;
  script: HoerenScriptSeed;
  questions: McQuestionSeed[];
}

/** Teil 2 : script + affirmations Richtig/Falsch. */
export interface HoerenTfSet {
  theme: string;
  script: HoerenScriptSeed;
  statements: { text: string; correct: "richtig" | "falsch" }[];
}

/* ================= HÖREN TEIL 1 — längeres Gespräch ================= */
export const HOEREN_TEIL1_SETS: HoerenMcSet[] = [
  {
    theme: "firmenfeier",
    script: {
      speakers: ["Anna", "Bernd"],
      targetSeconds: 150,
      text:
        "Anna: Hallo Bernd, hier ist Anna aus dem Marketing. Hast du kurz Zeit? Es geht um die Feier zum fünfzigjährigen Firmenjubiläum – die Geschäftsführung möchte, dass wir beide das organisieren.\n" +
        "Bernd: Klar, gute Idee. Hast du schon einen Termin im Kopf?\n" +
        "Anna: Ich dachte an einen Freitagabend im Juni. Da ist das Wetter meistens schön, und die Leute müssen am nächsten Tag nicht arbeiten.\n" +
        "Bernd: Freitag passt. Und wo? Im letzten Jahr waren wir ja in diesem Restaurant, das war ganz schön teuer.\n" +
        "Anna: Genau, deshalb hätte ich einen anderen Vorschlag: Wir könnten den Garten hinter unserem Bürogebäude nutzen. Der ist groß genug, und wir sparen die Miete für einen Saal.\n" +
        "Bernd: Der Garten – daran habe ich gar nicht gedacht. Bei gutem Wetter wäre das wirklich schön. Nur beim Essen bin ich mir unsicher. Ich fände ein warmes Buffet besser.\n" +
        "Anna: Hm, ich bin eher für kaltes Fingerfood. Das ist einfacher und die Gäste können herumlaufen und sich unterhalten. Aber darüber müssen wir noch reden.\n" +
        "Bernd: Einverstanden, das klären wir später. Wer macht was?\n" +
        "Anna: Ich kümmere mich um die Einladungen und die Gästeliste. Könntest du dich um die Technik und die Musik kümmern?\n" +
        "Bernd: Mach ich. Ich frage auch mal, ob ein Kollege seine Musikanlage mitbringt. Dann sparen wir noch mehr.\n" +
        "Anna: Perfekt. Dann telefonieren wir nächste Woche noch mal wegen des Essens. Danke dir, Bernd!",
    },
    questions: [
      {
        prompt: "Warum ruft Anna bei Bernd an?",
        correct: "Sie sollen zusammen die Jubiläumsfeier organisieren.",
        distractors: [
          "Sie möchte sich über die Geschäftsführung beschweren.",
          "Sie braucht Hilfe bei einer Marketingkampagne.",
        ],
      },
      {
        prompt: "Wann soll die Feier stattfinden?",
        correct: "An einem Freitagabend im Juni.",
        distractors: [
          "An einem Samstag im Frühling.",
          "An einem Wochentag im Juli.",
        ],
      },
      {
        prompt: "Welchen Ort schlägt Anna vor?",
        correct: "Den Garten hinter dem Bürogebäude.",
        distractors: [
          "Dasselbe Restaurant wie im letzten Jahr.",
          "Einen gemieteten Festsaal.",
        ],
      },
      {
        prompt: "Worüber sind sich Anna und Bernd noch nicht einig?",
        correct: "Ob es warmes oder kaltes Essen geben soll.",
        distractors: [
          "An welchem Tag die Feier stattfindet.",
          "Ob überhaupt gefeiert werden soll.",
        ],
      },
      {
        prompt: "Welche Aufgabe übernimmt Anna?",
        correct: "Sie kümmert sich um die Einladungen und die Gästeliste.",
        distractors: [
          "Sie organisiert die Technik und die Musik.",
          "Sie besorgt eine Musikanlage von einem Kollegen.",
        ],
      },
    ],
  },
  {
    theme: "fitnessstudio",
    script: {
      speakers: ["Berater", "Frau Klein"],
      targetSeconds: 160,
      text:
        "Berater: Guten Tag und willkommen im FitPoint. Wie kann ich Ihnen helfen?\n" +
        "Frau Klein: Hallo, ich interessiere mich für eine Mitgliedschaft. Ich möchte vor allem etwas für meinen Rücken tun.\n" +
        "Berater: Da sind Sie bei uns genau richtig. Wir haben spezielle Rückenkurse, immer dienstags und donnerstags am Abend.\n" +
        "Frau Klein: Abends passt mir gut, denn tagsüber arbeite ich. Und was kostet die Mitgliedschaft?\n" +
        "Berater: Der normale Tarif liegt bei 39 Euro im Monat. Wenn Sie sich gleich für ein ganzes Jahr anmelden, zahlen Sie nur 29 Euro.\n" +
        "Frau Klein: Das klingt fair. Kann ich das Studio denn vorher einmal ausprobieren?\n" +
        "Berater: Selbstverständlich. Sie bekommen ein kostenloses Probetraining, inklusive einer kurzen Einführung an den Geräten.\n" +
        "Frau Klein: Sehr gut. Und muss ich für die Kurse extra bezahlen?\n" +
        "Berater: Nein, die Kurse sind im Preis schon enthalten. Nur für die Sauna kommt ein kleiner Aufpreis dazu.\n" +
        "Frau Klein: Die Sauna brauche ich nicht. Dann würde ich gern das Probetraining machen. Ginge das noch heute?\n" +
        "Berater: Heute ist der Trainer leider schon ausgebucht. Aber morgen um 17 Uhr hätte ich einen Termin frei.\n" +
        "Frau Klein: Morgen um 17 Uhr passt mir gut. Vielen Dank!",
    },
    questions: [
      {
        prompt: "Warum kommt Frau Klein ins Fitnessstudio?",
        correct: "Sie möchte etwas für ihren Rücken tun.",
        distractors: [
          "Sie sucht dort eine Arbeitsstelle.",
          "Sie will vor allem die Sauna nutzen.",
        ],
      },
      {
        prompt: "Wann finden die Rückenkurse statt?",
        correct: "Dienstags und donnerstags am Abend.",
        distractors: [
          "Jeden Morgen vor der Arbeit.",
          "Nur am Wochenende.",
        ],
      },
      {
        prompt: "Wie viel kostet die Mitgliedschaft bei Anmeldung für ein Jahr?",
        correct: "29 Euro im Monat.",
        distractors: [
          "39 Euro im Monat.",
          "Sie ist im ersten Jahr kostenlos.",
        ],
      },
      {
        prompt: "Was ist im Preis nicht enthalten?",
        correct: "Die Nutzung der Sauna.",
        distractors: [
          "Die Teilnahme an den Kursen.",
          "Das erste Probetraining.",
        ],
      },
      {
        prompt: "Wann macht Frau Klein das Probetraining?",
        correct: "Am nächsten Tag um 17 Uhr.",
        distractors: [
          "Noch am selben Tag.",
          "Erst in einer Woche.",
        ],
      },
    ],
  },
];

/* ================= HÖREN TEIL 2 — Interview ================= */
export const HOEREN_TEIL2_SETS: HoerenTfSet[] = [
  {
    theme: "ernaehrung-interview",
    script: {
      speakers: ["Moderatorin", "Frau Dr. Roth"],
      targetSeconds: 240,
      text:
        "Moderatorin: Herzlich willkommen. Bei uns ist heute die Ernährungswissenschaftlerin Frau Dr. Roth. Frau Roth, viele Menschen lassen morgens das Frühstück ausfallen. Ist das ein Problem?\n" +
        "Dr. Roth: Nicht unbedingt. Lange hieß es, das Frühstück sei die wichtigste Mahlzeit des Tages. Diese Aussage lässt sich wissenschaftlich aber nicht eindeutig belegen. Entscheidend ist, was und wie viel man insgesamt über den Tag isst.\n" +
        "Moderatorin: Also darf ich das Frühstück ruhig weglassen?\n" +
        "Dr. Roth: Wenn Sie morgens keinen Hunger haben, spricht nichts dagegen. Wichtig ist nur, dass Sie dann nicht aus lauter Heißhunger mittags zu große Portionen essen. Manche Menschen brauchen das Frühstück, um konzentriert arbeiten zu können, andere nicht.\n" +
        "Moderatorin: Was halten Sie von süßen Frühstücksflocken für Kinder?\n" +
        "Dr. Roth: Davon rate ich ab. Viele dieser Produkte enthalten erstaunlich viel Zucker. Ein Vollkornbrot mit etwas Käse und einem Apfel sättigt länger und ist deutlich gesünder.\n" +
        "Moderatorin: Und der klassische Kaffee am Morgen?\n" +
        "Dr. Roth: Gegen eine Tasse Kaffee ist nichts einzuwenden. Problematisch wird es erst, wenn man den Kaffee mit viel Zucker und Sahne trinkt. Wasser bleibt aber das beste Getränk, gerade direkt nach dem Aufstehen.\n" +
        "Moderatorin: Ihr wichtigster Rat zum Schluss?\n" +
        "Dr. Roth: Hören Sie auf Ihren Körper. Es gibt keine Regel, die für alle gilt. Wer sich abwechslungsreich ernährt und nicht ständig nebenbei isst, macht schon vieles richtig.",
    },
    statements: [
      { text: "Frau Dr. Roth ist von Beruf Ernährungswissenschaftlerin.", correct: "richtig" },
      { text: "Dass das Frühstück die wichtigste Mahlzeit ist, lässt sich klar beweisen.", correct: "falsch" },
      { text: "Laut Dr. Roth zählt vor allem, was man am ganzen Tag isst.", correct: "richtig" },
      { text: "Wer morgens keinen Hunger hat, darf das Frühstück weglassen.", correct: "richtig" },
      { text: "Dr. Roth warnt davor, mittags aus Heißhunger zu viel zu essen.", correct: "richtig" },
      { text: "Alle Menschen brauchen ein Frühstück, um sich konzentrieren zu können.", correct: "falsch" },
      { text: "Süße Frühstücksflocken für Kinder empfiehlt sie ausdrücklich.", correct: "falsch" },
      { text: "Ein Vollkornbrot mit Käse sättigt laut Dr. Roth länger.", correct: "richtig" },
      { text: "Kaffee am Morgen hält sie grundsätzlich für schädlich.", correct: "falsch" },
      { text: "Ihr abschließender Rat lautet, auf den eigenen Körper zu hören.", correct: "richtig" },
    ],
  },
  {
    theme: "schlaf-interview",
    script: {
      speakers: ["Moderator", "Dr. Weber"],
      targetSeconds: 240,
      text:
        "Moderator: Herzlich willkommen. Heute sprechen wir mit dem Schlafforscher Herrn Dr. Weber. Herr Weber, wie viele Stunden Schlaf braucht ein Erwachsener?\n" +
        "Dr. Weber: Das ist von Mensch zu Mensch verschieden. Die meisten kommen mit sieben bis acht Stunden gut aus, einige brauchen aber deutlich weniger oder mehr. Eine feste Regel für alle gibt es nicht.\n" +
        "Moderator: Viele Menschen schauen abends noch lange auf ihr Handy. Ist das ein Problem?\n" +
        "Dr. Weber: Ja, das kann den Schlaf tatsächlich stören. Das helle Bildschirmlicht signalisiert dem Körper, dass es noch Tag ist. Ich empfehle, das Handy mindestens eine halbe Stunde vor dem Schlafengehen wegzulegen.\n" +
        "Moderator: Hilft es, am Wochenende den fehlenden Schlaf nachzuholen?\n" +
        "Dr. Weber: Nur begrenzt. Wer unter der Woche zu wenig schläft, kann das am Wochenende nicht vollständig ausgleichen. Besser ist ein regelmäßiger Rhythmus, also möglichst immer zur gleichen Zeit ins Bett zu gehen.\n" +
        "Moderator: Was halten Sie von einem kurzen Mittagsschlaf?\n" +
        "Dr. Weber: Ein Nickerchen von etwa zwanzig Minuten kann sehr erfrischend sein. Wird der Mittagsschlaf aber zu lang, fühlt man sich danach oft schlapper als vorher.\n" +
        "Moderator: Und Kaffee am Nachmittag?\n" +
        "Dr. Weber: Empfindlichen Menschen rate ich davon ab. Koffein bleibt viele Stunden im Körper und kann das Einschlafen am Abend erschweren.\n" +
        "Moderator: Ihr wichtigster Tipp zum Schluss?\n" +
        "Dr. Weber: Sorgen Sie für ein dunkles, kühles Schlafzimmer und für feste Zeiten. Der Körper liebt Regelmäßigkeit.",
    },
    statements: [
      { text: "Herr Dr. Weber erforscht von Beruf den Schlaf.", correct: "richtig" },
      { text: "Laut Dr. Weber braucht jeder Mensch genau acht Stunden Schlaf.", correct: "falsch" },
      { text: "Das Licht des Handys kann den Schlaf stören.", correct: "richtig" },
      { text: "Er empfiehlt, das Handy bis unmittelbar vor dem Einschlafen zu benutzen.", correct: "falsch" },
      { text: "Fehlenden Schlaf kann man am Wochenende vollständig nachholen.", correct: "falsch" },
      { text: "Dr. Weber rät zu einem regelmäßigen Schlafrhythmus.", correct: "richtig" },
      { text: "Ein Nickerchen von etwa zwanzig Minuten kann erfrischend sein.", correct: "richtig" },
      { text: "Ein sehr langer Mittagsschlaf macht laut Dr. Weber oft noch müder.", correct: "richtig" },
      { text: "Kaffee am Nachmittag empfiehlt er empfindlichen Menschen ausdrücklich.", correct: "falsch" },
      { text: "Er rät zu einem dunklen und kühlen Schlafzimmer.", correct: "richtig" },
    ],
  },
];

/* ================= HÖREN TEIL 3 — Ansagen & Nachrichten ================= */
export const HOEREN_TEIL3_SETS: HoerenMcSet[] = [
  {
    theme: "durchsagen",
    script: {
      speakers: ["Ansage"],
      targetSeconds: 150,
      text:
        "Ansage 1: Achtung, eine Durchsage für die Reisenden nach Hamburg. Der ICE 574 hat wegen Bauarbeiten etwa zwanzig Minuten Verspätung. Die Abfahrt erfolgt voraussichtlich um 14:35 Uhr von Gleis 8 statt von Gleis 3.\n\n" +
        "Ansage 2: Liebe Kundinnen und Kunden, unser Supermarkt schließt in zehn Minuten. Bitte begeben Sie sich zu den Kassen. Morgen sind wir wegen des Feiertags geschlossen, ab übermorgen wieder wie gewohnt für Sie da.\n\n" +
        "Ansage 3: Guten Tag, hier ist die Praxis Dr. Sommer. Wir möchten Sie daran erinnern, dass Ihr Termin morgen nicht wie geplant um 9 Uhr, sondern erst um 11 Uhr stattfindet. Sollten Sie den Termin nicht wahrnehmen können, rufen Sie uns bitte zurück.\n\n" +
        "Ansage 4: Willkommen im Stadtmuseum. Wir weisen darauf hin, dass die Sonderausstellung im zweiten Stock heute leider geschlossen ist. Alle anderen Bereiche können Sie wie gewohnt besichtigen. Der Eintritt ist heute für Kinder kostenlos.\n\n" +
        "Ansage 5: Hallo, hier spricht der Automatische Ansagedienst des Schwimmbads. Wegen einer technischen Störung bleibt das Hallenbad heute den ganzen Tag geschlossen. Das Freibad nebenan ist bei schönem Wetter normal geöffnet.",
    },
    questions: [
      {
        prompt: "Was erfahren die Reisenden nach Hamburg?",
        correct: "Der Zug fährt später und von einem anderen Gleis ab.",
        distractors: [
          "Der Zug fällt heute vollständig aus.",
          "Der Zug fährt früher als geplant ab.",
        ],
      },
      {
        prompt: "Wann ist der Supermarkt geschlossen?",
        correct: "Am nächsten Tag, wegen eines Feiertags.",
        distractors: [
          "Ab sofort für mehrere Tage.",
          "Nur am Vormittag des Feiertags.",
        ],
      },
      {
        prompt: "Was teilt die Arztpraxis mit?",
        correct: "Der Termin wird auf 11 Uhr verschoben.",
        distractors: [
          "Der Termin fällt ersatzlos aus.",
          "Der Termin bleibt unverändert um 9 Uhr.",
        ],
      },
      {
        prompt: "Was gilt heute im Stadtmuseum?",
        correct: "Die Sonderausstellung ist geschlossen.",
        distractors: [
          "Das ganze Museum ist geschlossen.",
          "Der Eintritt ist für alle kostenlos.",
        ],
      },
      {
        prompt: "Warum ist das Hallenbad geschlossen?",
        correct: "Wegen einer technischen Störung.",
        distractors: [
          "Wegen eines Feiertags.",
          "Wegen schlechten Wetters.",
        ],
      },
    ],
  },
  {
    theme: "durchsagen-2",
    script: {
      speakers: ["Ansage"],
      targetSeconds: 160,
      text:
        "Ansage 1: Sehr geehrte Fluggäste, der Flug LH 218 nach Wien verzögert sich um etwa vierzig Minuten. Der neue Abflug ist um 16:10 Uhr. Bitte beachten Sie außerdem, dass sich das Gate von B12 auf B27 geändert hat.\n\n" +
        "Ansage 2: Liebe Besucherinnen und Besucher der Stadtbibliothek. Wegen einer Autorenlesung schließen wir heute bereits um 17 Uhr, also zwei Stunden früher als sonst. Ausgeliehene Bücher können Sie wie gewohnt am Rückgabeautomaten abgeben.\n\n" +
        "Ansage 3: Guten Tag, hier ist der Paketdienst. Wir haben Sie heute leider nicht angetroffen. Ihr Paket liegt nun in der Postfiliale in der Lindenstraße und kann dort innerhalb der nächsten sieben Tage abgeholt werden.\n\n" +
        "Ansage 4: Willkommen im Kino Astoria. Wir bedauern, dass die Vorstellung um 20 Uhr bereits ausverkauft ist. Für denselben Film bieten wir jedoch eine zusätzliche Vorstellung um 22:30 Uhr an. Karten erhalten Sie an der Kasse.\n\n" +
        "Ansage 5: Achtung, eine Information für die Fahrgäste der Straßenbahnlinie 4. Wegen eines Unfalls fährt die Linie zwischen Marktplatz und Hauptbahnhof zurzeit nicht. Es ist ein Busersatzverkehr eingerichtet. Bitte planen Sie etwas mehr Zeit ein.",
    },
    questions: [
      {
        prompt: "Was erfahren die Fluggäste nach Wien?",
        correct: "Der Flug ist verspätet und das Gate hat sich geändert.",
        distractors: [
          "Der Flug fällt heute aus.",
          "Der Flug startet früher als geplant.",
        ],
      },
      {
        prompt: "Was gilt heute in der Stadtbibliothek?",
        correct: "Sie schließt früher als üblich.",
        distractors: [
          "Sie bleibt den ganzen Tag geschlossen.",
          "Die Buchrückgabe ist heute nicht möglich.",
        ],
      },
      {
        prompt: "Was teilt der Paketdienst mit?",
        correct: "Das Paket kann in einer Filiale abgeholt werden.",
        distractors: [
          "Das Paket wird morgen erneut zugestellt.",
          "Das Paket ging zurück an den Absender.",
        ],
      },
      {
        prompt: "Was bietet das Kino an?",
        correct: "Eine zusätzliche, spätere Vorstellung desselben Films.",
        distractors: [
          "Der Film wird heute gar nicht gezeigt.",
          "Alle Vorstellungen des Tages sind ausverkauft.",
        ],
      },
      {
        prompt: "Was gilt für die Straßenbahnlinie 4?",
        correct: "Zwischen zwei Stationen fahren Busse statt der Bahn.",
        distractors: [
          "Die Linie fällt den ganzen Tag komplett aus.",
          "Die Fahrgäste sollen ein Taxi nehmen.",
        ],
      },
    ],
  },
];
