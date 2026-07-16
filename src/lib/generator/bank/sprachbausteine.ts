/**
 * BANQUE Sprachbausteine — deux formats de texte à trous ORIGINAUX, niveau B2.
 *
 * Teil 1 (CLOZE_DROPDOWN, 4 options par lacune) : chaque lacune a UNE réponse
 * correcte et trois distracteurs propres à la lacune. Testé : grammaire,
 * prépositions, connecteurs, verbes, collocations, tournures.
 *
 * Teil 2 (CLOZE_DROPDOWN + banque de 15 mots A–O) : 10 lacunes se remplissent
 * avec 10 mots d'une banque commune ; 5 mots restent inutilisés (distracteurs).
 *
 * Les textes portent les marqueurs {{1}} … {{n}} ; l'ordre des `gaps`
 * correspond à l'ordre des marqueurs. Le moteur mélange les options (Teil 1)
 * ou les lettres de la banque (Teil 2) et recalcule les clés.
 */

export interface ClozeGapSeed {
  /** Réponse correcte. */
  correct: string;
  /** Trois distracteurs propres à cette lacune. */
  distractors: string[];
}

export interface SbTeil1Set {
  theme: string;
  /** Texte avec marqueurs {{1}} … {{10}}. */
  text: string;
  gaps: ClozeGapSeed[];
}

export interface SbTeil2Set {
  theme: string;
  text: string;
  /** Mots corrects, dans l'ordre des lacunes {{1}} … {{10}}. */
  solutions: string[];
  /** Cinq mots supplémentaires servant de distracteurs dans la banque. */
  distractorWords: string[];
}

export const SB_TEIL1_SETS: SbTeil1Set[] = [
  {
    theme: "absage-mail",
    text:
      "Sehr geehrte Frau Berg,\n\nvielen Dank für die freundliche Einladung zum Netzwerktreffen am 14. März. Leider kann ich {{1}} eines anderen Termins nicht daran teilnehmen. {{2}} würde ich Sie und Ihr Team sehr gern kennenlernen. Ich {{3}} deshalb vor, unser Gespräch auf einen späteren Zeitpunkt zu verschieben.\n\nGern würde ich {{4}} nach Ihrem Terminkalender richten. Vielleicht könnten wir uns {{5}} einen neuen Termin einigen. {{6}} es Ihnen recht ist, rufe ich Sie in der nächsten Woche an. Teilen Sie mir bitte mit, welcher Tag Ihnen am besten {{7}}.\n\nFür Ihr Verständnis {{8}} ich mich schon jetzt. Ich freue mich {{9}} eine baldige Antwort.\n\nMit freundlichen {{10}}\nJonas Reiter",
    gaps: [
      { correct: "aufgrund", distractors: ["trotz", "gegen", "um"] },
      { correct: "Dennoch", distractors: ["Deshalb", "Sobald", "Damit"] },
      { correct: "schlage", distractors: ["stelle", "biete", "gebe"] },
      { correct: "mich", distractors: ["mir", "sich", "uns"] },
      { correct: "auf", distractors: ["über", "an", "für"] },
      { correct: "Falls", distractors: ["Obwohl", "Damit", "Nachdem"] },
      { correct: "passt", distractors: ["steht", "gefällt", "reicht"] },
      { correct: "bedanke", distractors: ["entschuldige", "freue", "kümmere"] },
      { correct: "auf", distractors: ["vor", "zu", "nach"] },
      { correct: "Grüßen", distractors: ["Wünschen", "Worten", "Dank"] },
    ],
  },
  {
    theme: "reparaturstation",
    text:
      "In unserer Stadt gibt es {{1}} Kurzem eine kostenlose Reparaturstation für Fahrräder. Direkt am Bahnhof können Radfahrer ihr Rad selbst {{2}}. An einer Säule hängen verschiedene Werkzeuge, {{3}} man für kleine Reparaturen braucht. Auch eine Luftpumpe steht {{4}}. Die Idee stammt von einer Gruppe engagierter Bürger, die etwas {{5}} den wachsenden Radverkehr tun wollten. {{6}} die Station rund um die Uhr zugänglich ist, wird sie auch spätabends genutzt. Bisher wurde nichts beschädigt, {{7}} viele zunächst befürchtet hatten. Die Stadt ist zufrieden und {{8}} bereits weitere Stationen für das nächste Jahr. Ihr Erfolg {{9}} allerdings davon ab, ob die Bürger sorgsam mit den Geräten umgehen. Wer einen Defekt bemerkt, kann ihn {{10}} einer App melden.",
    gaps: [
      { correct: "seit", distractors: ["vor", "ab", "nach"] },
      { correct: "reparieren", distractors: ["fahren", "kaufen", "abstellen"] },
      { correct: "die", distractors: ["das", "was", "denen"] },
      { correct: "bereit", distractors: ["fertig", "offen", "frei"] },
      { correct: "für", distractors: ["gegen", "über", "um"] },
      { correct: "Weil", distractors: ["Obwohl", "Damit", "Bevor"] },
      { correct: "obwohl", distractors: ["weil", "damit", "als"] },
      { correct: "plant", distractors: ["wünscht", "gelingt", "besteht"] },
      { correct: "hängt", distractors: ["kommt", "liegt", "steht"] },
      { correct: "mit", distractors: ["aus", "bei", "von"] },
    ],
  },
];

export const SB_TEIL2_SETS: SbTeil2Set[] = [
  {
    theme: "neuer-job",
    text:
      "Vor drei Monaten habe ich eine neue Stelle in einer anderen Stadt {{1}}. Am Anfang fiel es mir schwer, mich in der fremden Umgebung {{2}}. {{3}} kannte ich niemanden, und die Wege zur Arbeit waren lang. Zum Glück haben mir meine neuen Kollegen sofort ihre Hilfe {{4}}. Eine Kollegin hat mir sogar in Ruhe {{5}}, wie das Ablagesystem funktioniert.\n\n{{6}} der vielen Überstunden in den ersten Wochen habe ich mich schnell eingelebt. Inzwischen {{7}} ich mich in der Firma richtig wohl. Am Wochenende {{8}} ich oft die Umgebung und habe schon einige schöne Ecken entdeckt. {{9}} hatte ich noch ein paar Urlaubstage übrig, die ich für einen kurzen Besuch bei meiner Familie {{10}} habe.",
    solutions: [
      "angenommen", // 1 — eine Stelle annehmen
      "zurechtzufinden", // 2 — sich zurechtfinden
      "Zunächst", // 3
      "angeboten", // 4 — Hilfe anbieten
      "erklärt", // 5
      "Trotz", // 6 — Präposition + Genitiv
      "fühle", // 7 — sich wohlfühlen
      "erkunde", // 8 — die Umgebung erkunden
      "Außerdem", // 9
      "genutzt", // 10 — Urlaubstage nutzen
    ],
    distractorWords: ["abgelehnt", "verloren", "obwohl", "bekommen", "vergessen"],
  },
  {
    theme: "bergwanderung",
    text:
      "Letztes Wochenende habe ich mit Freunden einen Ausflug in die Berge {{1}}. Schon Wochen vorher hatten wir die Wanderung sorgfältig {{2}}. Am Samstagmorgen sind wir früh {{3}}, um dem größten Andrang zu entgehen. Der Aufstieg war anstrengend, doch die Aussicht oben hat uns für die Mühe {{4}}. Unterwegs haben wir mehrere Pausen {{5}} und die frische Luft genossen.\n\n{{6}} des schlechten Wetterberichts blieb es zum Glück trocken. Am Gipfel haben wir andere Wanderer {{7}}, die uns einen kürzeren Rückweg empfahlen. Diesen Tipp haben wir dankbar {{8}}. Auf dem Rückweg hat sich einer von uns leicht am Knöchel {{9}}, konnte aber weitergehen. {{10}} waren alle erschöpft, aber glücklich über den gelungenen Tag.",
    solutions: [
      "gemacht", // 1 — einen Ausflug machen
      "geplant", // 2
      "aufgebrochen", // 3 — aufbrechen
      "entschädigt", // 4 — für die Mühe entschädigen
      "eingelegt", // 5 — Pausen einlegen
      "Trotz", // 6 — Präposition + Genitiv
      "getroffen", // 7 — Wanderer treffen
      "angenommen", // 8 — einen Tipp annehmen
      "verletzt", // 9 — sich verletzen
      "Schließlich", // 10
    ],
    distractorWords: ["abgesagt", "verloren", "obwohl", "vergessen", "bekommen"],
  },
];
