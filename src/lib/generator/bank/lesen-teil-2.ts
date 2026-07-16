/**
 * BANQUE Lesen Teil 2 — Detailverstehen. Chaque entrée = un texte source
 * ORIGINAL (env. 200–240 mots, niveau B2) et cinq questions à trois options,
 * dont une seule correcte. Les distracteurs sont crédibles mais contredits
 * par le texte ou non couverts (piège telc classique).
 *
 * Le moteur (parts/lesen-teil-2.ts) tire UN jeu, mélange l'ordre des trois
 * options de chaque question et recalcule la clé — la bonne réponse n'est
 * donc jamais systématiquement en a.
 */
export interface McQuestionSeed {
  prompt: string;
  /** Formulation CORRECTE (fidèle au texte). */
  correct: string;
  /** Deux distracteurs plausibles mais faux. */
  distractors: [string, string];
}

export interface LesenTeil2Seed {
  theme: string;
  sourceText: string;
  questions: McQuestionSeed[];
}

export const LESEN_TEIL2_SEEDS: LesenTeil2Seed[] = [
  {
    theme: "ehrenamt-ruhestand",
    sourceText:
      "Aktiv im Ruhestand\n\nWenn Menschen in Rente gehen, fällt für viele plötzlich eine feste Tagesstruktur weg. Eine wachsende Zahl von Ruheständlern sucht deshalb eine neue Aufgabe im Ehrenamt. In der Stadt Bremen vermittelt eine eigens gegründete Agentur ältere Freiwillige an Schulen, Vereine und soziale Einrichtungen. Nachgefragt sind vor allem Menschen, die Kindern beim Lesen helfen oder Geflüchteten die deutsche Sprache näherbringen.\n\nAnders als früher angenommen geht es den Freiwilligen selten ums Geld. Eine Aufwandsentschädigung wird zwar gezahlt, doch die meisten nennen andere Gründe: Sie wollen gebraucht werden und mit jüngeren Generationen in Kontakt bleiben. „Ich habe vierzig Jahre lang unterrichtet. Ganz aufzuhören kam für mich nicht infrage“, sagt eine 68-jährige Teilnehmerin.\n\nDie Agentur achtet allerdings darauf, dass aus dem Engagement keine Überforderung wird. Wer sich meldet, verpflichtet sich zu höchstens sechs Stunden pro Woche. Auch eine kurze Schulung gehört dazu, denn nicht jeder erfahrene Berufstätige weiß, wie man heute mit Jugendlichen umgeht. Kritiker wenden ein, dass verlässliche Aufgaben eigentlich bezahlte Fachkräfte erfordern. Die Leiterin der Agentur widerspricht: Das Ehrenamt ersetze keine Stelle, sondern schaffe etwas, wofür im Berufsalltag oft die Zeit fehle – Zuwendung und Geduld.",
    questions: [
      {
        prompt: "Warum suchen viele Menschen im Ruhestand ein Ehrenamt?",
        correct: "Ihnen fehlt nach dem Berufsleben eine feste Tagesstruktur.",
        distractors: [
          "Sie sind auf ein zusätzliches Einkommen angewiesen.",
          "Sie möchten eine bezahlte Fachkraft ersetzen.",
        ],
      },
      {
        prompt: "Welche Freiwilligen werden besonders gesucht?",
        correct: "Menschen, die beim Lesen oder beim Deutschlernen helfen.",
        distractors: [
          "Menschen, die eine Führungsposition übernehmen wollen.",
          "Menschen mit einer abgeschlossenen Ausbildung im Sozialwesen.",
        ],
      },
      {
        prompt: "Was ist den meisten Freiwilligen am wichtigsten?",
        correct: "Das Gefühl, gebraucht zu werden und Kontakt zu haben.",
        distractors: [
          "Die Höhe der Aufwandsentschädigung.",
          "Die Aussicht auf eine spätere Festanstellung.",
        ],
      },
      {
        prompt: "Wie begrenzt die Agentur das Engagement?",
        correct: "Sie erlaubt höchstens sechs Stunden Einsatz pro Woche.",
        distractors: [
          "Sie nimmt nur Bewerber unter siebzig Jahren an.",
          "Sie vermittelt jeden Freiwilligen nur an eine einzige Schule.",
        ],
      },
      {
        prompt: "Wie reagiert die Leiterin auf die Kritik?",
        correct: "Das Ehrenamt ersetze keine Stelle, sondern ergänze sie.",
        distractors: [
          "Sie gibt zu, dass Fachkräfte besser geeignet wären.",
          "Sie fordert, das Ehrenamt künftig fest zu bezahlen.",
        ],
      },
    ],
  },
  {
    theme: "schulgarten",
    sourceText:
      "Der Schulgarten kehrt zurück\n\nLange galt der Schulgarten als altmodisch, viele Beete verschwanden zugunsten von Parkplätzen oder Sportflächen. Nun entdecken immer mehr Schulen das Gärtnern neu. An einer Gesamtschule in Kassel bauen Schülerinnen und Schüler seit zwei Jahren Kartoffeln, Bohnen und Kräuter an. Der Unterricht im Freien ist fester Bestandteil des Stundenplans geworden.\n\nDie Lehrkräfte berichten von einem unerwarteten Nebeneffekt. Kinder, die im Klassenzimmer oft unruhig sind, arbeiten im Garten konzentriert und geduldig. Wer selbst gesät hat, wartet gespannt auf die Ernte und lernt dabei, dass sich Erfolg nicht sofort einstellt. Auch der Zusammenhalt in der Klasse wachse, weil die Arbeit nur gemeinsam gelingt.\n\nFinanziert wird das Projekt bislang über Spenden und die Hilfe von Eltern. Genau das sieht die Schulleitung als Schwäche: Ohne feste Mittel bleibt unklar, ob der Garten in einigen Jahren noch besteht. Sie fordert deshalb, dass das Land solche Vorhaben dauerhaft unterstützt. Ein Wissenschaftler der Universität gibt jedoch zu bedenken, dass ein Garten allein die Ernährungsgewohnheiten der Kinder nicht verändere. Entscheidend sei, dass die Familien zu Hause mitzögen – sonst verpuffe die Wirkung nach kurzer Zeit.",
    questions: [
      {
        prompt: "Warum verschwanden früher viele Schulgärten?",
        correct: "Die Flächen wurden für Parkplätze oder Sport genutzt.",
        distractors: [
          "Den Schulen fehlte es an interessierten Lehrkräften.",
          "Die Ernte reichte nie für die ganze Klasse aus.",
        ],
      },
      {
        prompt: "Welchen Nebeneffekt beobachten die Lehrkräfte?",
        correct: "Sonst unruhige Kinder arbeiten im Garten konzentriert.",
        distractors: [
          "Die Schüler bekommen im Garten deutlich bessere Noten.",
          "Die Kinder essen zu Hause automatisch gesünder.",
        ],
      },
      {
        prompt: "Was lernen die Kinder laut Text beim Gärtnern?",
        correct: "Dass sich Erfolg nicht sofort einstellt.",
        distractors: [
          "Dass Handarbeit anstrengender ist als Unterricht.",
          "Dass Pflanzen ohne ständige Pflege besser gedeihen.",
        ],
      },
      {
        prompt: "Worin sieht die Schulleitung ein Problem?",
        correct: "In der fehlenden dauerhaften Finanzierung.",
        distractors: [
          "In der mangelnden Begeisterung der Schüler.",
          "Im zu großen Zeitaufwand für die Lehrkräfte.",
        ],
      },
      {
        prompt: "Was gibt der Wissenschaftler zu bedenken?",
        correct: "Ohne Mithilfe der Familien verpuffe die Wirkung.",
        distractors: [
          "Ein Garten sei für jüngere Kinder zu gefährlich.",
          "Gemüseanbau lohne sich in der Stadt grundsätzlich nicht.",
        ],
      },
    ],
  },
  {
    theme: "coworking-land",
    sourceText:
      "Arbeiten auf dem Dorf\n\nWer in einer Kleinstadt oder auf dem Dorf wohnt und im Homeoffice arbeitet, sitzt oft allein am Küchentisch. In der Gemeinde Ostheim hat ein ehemaliger Lehrer daraus eine Idee gemacht: Er baute eine leer stehende Scheune zu einem Gemeinschaftsbüro um, in dem sich Berufstätige einen Arbeitsplatz mieten können. Schnelles Internet, Drucker und eine Küche stehen bereit.\n\nDas Angebot trifft einen Nerv. Vor allem Pendler, die früher täglich in die Stadt fuhren, sparen nun Zeit und Fahrtkosten. „Ich arbeite konzentrierter als zu Hause, wo mich die Wäsche und der Garten ablenken“, sagt eine Nutzerin. Zugleich entstehen neue Kontakte: Eine Grafikerin und ein Programmierer, die sich im Gemeinschaftsbüro kennenlernten, arbeiten inzwischen an einem gemeinsamen Auftrag.\n\nDoch nicht alle Plätze sind belegt. An manchen Tagen bleibt die Scheune fast leer, weil viele lieber ganz zu Hause bleiben und sich die Miete sparen. Der Gründer hofft nun auf einen Zuschuss der Gemeinde, denn ohne zusätzliche Einnahmen trägt sich das Projekt kaum. Der Bürgermeister zeigt sich offen, warnt aber davor, zu große Erwartungen zu wecken: Ein einzelnes Büro halte junge Menschen nicht allein im Dorf – dafür brauche es auch Ärzte, Schulen und einen guten Nahverkehr.",
    questions: [
      {
        prompt: "Was hat der ehemalige Lehrer in Ostheim geschaffen?",
        correct: "Ein Gemeinschaftsbüro in einer umgebauten Scheune.",
        distractors: [
          "Eine neue Buslinie in die nächste Stadt.",
          "Eine Beratungsstelle für arbeitslose Pendler.",
        ],
      },
      {
        prompt: "Welchen Vorteil nennen die Pendler?",
        correct: "Sie sparen Zeit und Fahrtkosten.",
        distractors: [
          "Sie verdienen im Büro mehr als zu Hause.",
          "Sie erhalten dort eine kostenlose Verpflegung.",
        ],
      },
      {
        prompt: "Warum arbeitet die zitierte Nutzerin lieber im Büro?",
        correct: "Zu Hause lenken sie Wäsche und Garten ab.",
        distractors: [
          "Das Internet zu Hause ist zu langsam.",
          "Sie fühlt sich allein zu Hause nicht sicher.",
        ],
      },
      {
        prompt: "Worin liegt das Problem des Projekts?",
        correct: "Oft sind zu wenige Plätze belegt.",
        distractors: [
          "Die Technik fällt regelmäßig aus.",
          "Die Nutzer stören sich gegenseitig bei der Arbeit.",
        ],
      },
      {
        prompt: "Wie beurteilt der Bürgermeister das Vorhaben?",
        correct: "Allein halte ein Büro junge Menschen nicht im Dorf.",
        distractors: [
          "Er lehnt jede finanzielle Unterstützung ab.",
          "Er hält das Projekt für vollständig überflüssig.",
        ],
      },
    ],
  },
];
