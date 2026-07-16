/**
 * BANQUE Schreiben — sujets ORIGINAUX niveau B2. Chaque sujet propose une
 * situation réaliste, une consigne et quatre Leitpunkte à traiter, plus un
 * modèle de production (pour le corrigé) et des critères d'évaluation.
 * Le champ `content` stocké en base ne contient que prompt / bulletPoints /
 * minWords ; le modèle et les critères servent aux exports (corrigé).
 */
export interface SchreibenSeed {
  theme: string;
  /** Consigne + contexte affichés au candidat. */
  prompt: string;
  /** Les quatre points obligatoires (Leitpunkte). */
  bulletPoints: string[];
  minWords: number;
  /** Production modèle B2 (corrigé, non montrée au candidat). */
  modelAnswer: string;
  /** Critères d'évaluation (corrigé). */
  criteria: string[];
}

export const SCHREIBEN_SEEDS: SchreibenSeed[] = [
  {
    theme: "beschwerde-sprachkurs",
    prompt:
      "Sie haben an einer Volkshochschule einen Deutschkurs gebucht, mit dem Sie nicht zufrieden sind. Schreiben Sie eine E-Mail an die Kursleitung. Begründen Sie Ihre Unzufriedenheit und bitten Sie um eine Lösung.",
    bulletPoints: [
      "Beschreiben Sie, welchen Kurs Sie besuchen und was Sie erwartet hatten.",
      "Erklären Sie, was Sie konkret stört (z. B. Gruppengröße, Tempo, Material).",
      "Nennen Sie die Folgen für Ihren Lernfortschritt.",
      "Machen Sie einen Vorschlag oder fordern Sie eine bestimmte Lösung.",
    ],
    minWords: 150,
    modelAnswer:
      "Sehr geehrte Damen und Herren,\n\nseit sechs Wochen besuche ich den Deutschkurs B2 am Dienstag- und Donnerstagabend. Bei der Anmeldung wurde mir eine kleine Lerngruppe zugesichert, in der man viel sprechen kann. Leider sieht die Realität anders aus.\n\nInzwischen sitzen wir zu über zwanzig Personen im Raum, sodass jeder Einzelne kaum zu Wort kommt. Außerdem ist das Tempo sehr hoch: Grammatikthemen werden nur kurz angerissen und danach vorausgesetzt. Für mich hat das spürbare Folgen, denn ich habe das Gefühl, mich mündlich überhaupt nicht zu verbessern, obwohl mir gerade das Sprechen wichtig wäre.\n\nIch möchte Sie daher bitten, die Gruppe zu verkleinern oder einen zusätzlichen Kurs anzubieten. Sollte das nicht möglich sein, würde ich gern in eine andere Gruppe wechseln.\n\nÜber eine baldige Rückmeldung würde ich mich sehr freuen.\n\nMit freundlichen Grüßen\n...",
    criteria: [
      "Alle vier Leitpunkte inhaltlich behandelt",
      "Angemessene, durchgehend höfliche Registerwahl (formelle E-Mail)",
      "Kohärenz durch Konnektoren; klarer Aufbau (Anrede, Anliegen, Schluss)",
      "Bandbreite und Korrektheit der B2-Strukturen; Mindestwortzahl erreicht",
    ],
  },
  {
    theme: "forum-homeoffice",
    prompt:
      "In einem Online-Forum wird darüber diskutiert, ob Homeoffice das Arbeitsleben verbessert. Schreiben Sie einen Beitrag, in dem Sie Ihre Meinung darlegen und begründen.",
    bulletPoints: [
      "Nennen Sie Ihre eigene Erfahrung oder Situation zum Thema Homeoffice.",
      "Führen Sie Vorteile des Arbeitens von zu Hause an.",
      "Gehen Sie auch auf mögliche Nachteile ein.",
      "Ziehen Sie ein begründetes Fazit.",
    ],
    minWords: 150,
    modelAnswer:
      "Ob Homeoffice das Arbeitsleben verbessert, wird ja gerade heiß diskutiert. Ich selbst arbeite seit zwei Jahren an drei Tagen pro Woche von zu Hause und möchte diese Erfahrung nicht mehr missen.\n\nDer größte Vorteil ist für mich der Wegfall des langen Arbeitswegs. Die Zeit, die ich früher im Zug verbracht habe, nutze ich heute für Sport oder für meine Familie. Außerdem kann ich mich zu Hause oft besser konzentrieren, weil das Großraumbüro wegfällt.\n\nAllerdings sehe ich auch Nachteile. Der Kontakt zu den Kolleginnen und Kollegen leidet, und manche Absprache dauert online länger als ein kurzes Gespräch im Flur. Wer zu Hause arbeitet, muss sich außerdem selbst gut organisieren, sonst verschwimmen Arbeit und Freizeit.\n\nInsgesamt überwiegen für mich die Vorteile, sofern man nicht völlig auf Bürotage verzichtet. Die Mischung aus beidem halte ich für die beste Lösung.",
    criteria: [
      "Alle vier Leitpunkte inhaltlich behandelt",
      "Textsorte Forumsbeitrag getroffen (halbformell, Meinung erkennbar)",
      "Argumentation mit Beispielen und abschließendem Fazit",
      "Bandbreite und Korrektheit der B2-Strukturen; Mindestwortzahl erreicht",
    ],
  },
  {
    theme: "bewerbung-ehrenamt",
    prompt:
      "Sie haben eine Anzeige gelesen, in der ehrenamtliche Helferinnen und Helfer für ein Stadtteilfest gesucht werden. Schreiben Sie eine E-Mail an die Organisatoren und bewerben Sie sich.",
    bulletPoints: [
      "Erklären Sie, warum Sie sich melden und woher Sie die Anzeige kennen.",
      "Beschreiben Sie Ihre Erfahrungen oder Fähigkeiten.",
      "Sagen Sie, wann und wie oft Sie helfen können.",
      "Bitten Sie um weitere Informationen zum Ablauf.",
    ],
    minWords: 150,
    modelAnswer:
      "Sehr geehrtes Organisationsteam,\n\nin der letzten Ausgabe des Stadtteilblatts habe ich Ihre Anzeige gelesen, in der Sie ehrenamtliche Helfer für das Sommerfest suchen. Da ich in diesem Viertel wohne und die Idee sehr unterstütze, möchte ich mich gern bei Ihnen melden.\n\nIn den vergangenen Jahren habe ich bereits mehrfach bei Schulfesten mitgeholfen, unter anderem am Getränkestand und bei der Betreuung von Kindern. Der Umgang mit vielen Menschen macht mir Freude, und ich behalte auch in stressigen Situationen den Überblick.\n\nZeitlich bin ich flexibel: An beiden Festtagen könnte ich jeweils den ganzen Nachmittag einplanen, bei Bedarf auch schon beim Aufbau am Vormittag.\n\nKönnten Sie mir noch mitteilen, wo und wann ein erstes Treffen stattfindet? Über eine kurze Rückmeldung freue ich mich.\n\nMit freundlichen Grüßen\n...",
    criteria: [
      "Alle vier Leitpunkte inhaltlich behandelt",
      "Formelle E-Mail mit passender Anrede und Grußformel",
      "Klarer Bezug zur Anzeige und überzeugende Selbstdarstellung",
      "Bandbreite und Korrektheit der B2-Strukturen; Mindestwortzahl erreicht",
    ],
  },
  {
    theme: "einladung-absage",
    prompt:
      "Eine gute Freundin, die in einer anderen Stadt wohnt, hat Sie zu ihrer Geburtstagsfeier eingeladen. Sie können leider nicht kommen. Schreiben Sie ihr eine E-Mail.",
    bulletPoints: [
      "Bedanken Sie sich für die Einladung und reagieren Sie darauf.",
      "Erklären Sie, warum Sie nicht kommen können.",
      "Schlagen Sie vor, wie Sie sich trotzdem bald sehen könnten.",
      "Wünschen Sie ihr etwas zum Geburtstag.",
    ],
    minWords: 150,
    modelAnswer:
      "Liebe Sophie,\n\nvielen Dank für deine liebe Einladung zu deinem dreißigsten Geburtstag! Ich habe mich riesig gefreut und hätte wirklich gern mit dir gefeiert.\n\nLeider muss ich dir absagen. Ausgerechnet an diesem Wochenende habe ich eine wichtige Prüfung, auf die ich mich seit Wochen vorbereite. Ich könnte mich einfach nicht entspannen und würde die ganze Zeit an den Stoff denken – das wäre schade für uns beide.\n\nDamit wir uns trotzdem bald sehen, hätte ich einen Vorschlag: Sobald meine Prüfung vorbei ist, komme ich dich für ein langes Wochenende besuchen. Dann feiern wir deinen Geburtstag eben zu zweit nach.\n\nIch wünsche dir von Herzen alles Gute, viel Gesundheit und einen wunderschönen Tag mit deinen Gästen. Feier schön – und lass uns bald telefonieren!\n\nGanz liebe Grüße\n...",
    criteria: [
      "Alle vier Leitpunkte inhaltlich behandelt",
      "Persönlicher, informeller Ton (Freundin) durchgehend passend",
      "Höfliche, nachvollziehbare Absage mit Alternativvorschlag",
      "Bandbreite und Korrektheit der B2-Strukturen; Mindestwortzahl erreicht",
    ],
  },
];
