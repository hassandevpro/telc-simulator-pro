import type { TitledText } from "../types";

/**
 * BANQUE Lesen Teil 1 — textes courts ORIGINAUX niveau B2 (env. 45–70 mots),
 * chacun avec sa meilleure « Überschrift ». Aucun contenu officiel telc n'est
 * reproduit : sujets et formulations sont écrits pour ce projet.
 *
 * Le moteur (parts/lesen-teil-1.ts) tire 5 textes ici, ajoute 5 titres
 * distracteurs (ci-dessous) et mélange les 10 titres en a–j. Plus la banque
 * est large, plus le nombre de Testsätze distincts croît (C(n,5) combinaisons).
 */
export const LESEN_TEIL1_TEXTS: TitledText[] = [
  {
    theme: "mobilität",
    title: "Das Lastenrad verdrängt in Innenstädten den Lieferwagen",
    text: "Immer mehr Paketdienste stellen in engen Altstädten auf elektrische Lastenräder um. Sie finden schneller einen Halt, stehen nicht im Stau und stoßen keine Abgase aus. Ein Zusteller in Köln berichtet, er schaffe pro Schicht sogar mehr Sendungen als früher mit dem Transporter – vor allem, weil die lästige Parkplatzsuche entfällt.",
  },
  {
    theme: "stadtnatur",
    title: "Bienenvölker finden auf Firmengeländen ein neues Zuhause",
    text: "Zahlreiche Unternehmen stellen inzwischen Bienenstöcke auf ungenutzte Rasenflächen ihres Betriebsgeländes. Imker betreuen die Völker, die Belegschaft erhält im Herbst eigenen Honig. Fachleute sehen darin mehr als eine nette Geste: In der Stadt finden Bienen oft ein vielfältigeres Blütenangebot als auf dem monotonen Agrarland ringsum.",
  },
  {
    theme: "konsum",
    title: "Statt wegwerfen: Freiwillige reparieren defekte Geräte",
    text: "In vielen Stadtteilen öffnen sogenannte Reparatur-Cafés ihre Türen. Wer einen kaputten Toaster oder eine wackelnde Lampe mitbringt, bekommt bei Kaffee und Kuchen ehrenamtliche Hilfe. Die Fachleute reparieren nichts allein, sondern zeigen den Besuchern, wie es geht. So landet weniger im Müll, und ganz nebenbei entstehen neue Bekanntschaften.",
  },
  {
    theme: "reisen",
    title: "Der Nachtzug erlebt in Europa eine überraschende Rückkehr",
    text: "Jahrelang galten Nachtzüge als überholt, viele Strecken wurden gestrichen. Nun bestellen mehrere Bahngesellschaften wieder neue Schlafwagen. Reisende schätzen es, abends einzusteigen und morgens ausgeruht in einer fernen Stadt anzukommen, ohne den Stress des Fliegens. Auch der geringere Ausstoß an Treibhausgasen spielt bei der Entscheidung eine wachsende Rolle.",
  },
  {
    theme: "digitales",
    title: "Ferien ohne Handy liegen bei Familien im Trend",
    text: "Einige Ferienhöfe werben neuerdings damit, dass es dort weder WLAN noch Fernsehempfang gibt. Gäste geben ihr Smartphone am Eingang freiwillig ab. Was zunächst nach Verzicht klingt, empfinden viele nach wenigen Tagen als Erleichterung: Die Kinder spielen wieder draußen, und abends bleibt Zeit für Gespräche statt für den Bildschirm.",
  },
  {
    theme: "ernährung",
    title: "Eine App rettet Lebensmittel vor der Mülltonne",
    text: "Bäckereien und Restaurants bieten am Abend übrig gebliebene Waren zum halben Preis in einer App an. Kundinnen und Kunden holen die gefüllten Tüten kurz vor Ladenschluss ab. Für die Betriebe ist das besser, als das Essen wegzuwerfen; die Käufer sparen Geld. Millionen Portionen bleiben so jährlich dem Abfall erspart.",
  },
  {
    theme: "wohnen",
    title: "Jung und Alt teilen sich unter einem Dach den Alltag",
    text: "In einem neuen Wohnprojekt in Leipzig leben Studierende und Rentner Tür an Tür. Die Jüngeren erledigen Einkäufe oder erklären das Tablet, die Älteren hüten manchmal die Kinder oder kochen gemeinsam. Beide Seiten zahlen weniger Miete und fühlen sich weniger allein. Die Warteliste für einen Platz ist inzwischen lang.",
  },
  {
    theme: "handel",
    title: "Im verpackungsfreien Laden bringt man die Dose selbst mit",
    text: "Nudeln, Reis und Waschmittel gibt es in manchen Geschäften nur noch lose. Die Kundschaft füllt die Ware in mitgebrachte Gläser und zahlt nach Gewicht. Der Verzicht auf Plastik spricht viele an, doch die Betreiber räumen ein: Ohne treue Stammkunden, die den kleinen Mehraufwand akzeptieren, rechnet sich das Konzept kaum.",
  },
  {
    theme: "ehrenamt",
    title: "Freiwilligen Feuerwehren fehlt zunehmend der Nachwuchs",
    text: "Auf dem Land verlassen sich viele Gemeinden auf freiwillige Feuerwehren. Doch immer weniger junge Menschen melden sich, weil sie zum Arbeiten in die Stadt ziehen. Tagsüber ist mancherorts kaum eine einsatzfähige Mannschaft zusammenzubekommen. Manche Kommunen locken nun mit Vergünstigungen, um dem drohenden Personalmangel rechtzeitig entgegenzuwirken.",
  },
  {
    theme: "kultur",
    title: "Freier Eintritt füllt an einem Wochentag die Museen",
    text: "Mehrere Städte lassen Besucher an einem festen Tag im Monat kostenlos in ihre Museen. Die Häuser sind an diesen Tagen spürbar voller, und es kommen Menschen, die sonst nie den Weg dorthin fänden. Kritiker fragen zwar, wer die entgangenen Einnahmen ausgleicht, doch die Kulturämter verteidigen das Angebot mit Nachdruck.",
  },
  {
    theme: "sprache",
    title: "Beim Sprachtandem lernt jeder vom anderen etwas",
    text: "In vielen Universitätsstädten treffen sich Menschen, um sich gegenseitig ihre Muttersprache beizubringen. Eine Stunde wird Deutsch gesprochen, eine Stunde die Sprache des Partners. Das kostet nichts und wirkt oft besser als ein Kurs, weil man von Anfang an frei redet. Aus manchem Tandem sind schon feste Freundschaften geworden.",
  },
  {
    theme: "mode",
    title: "Gebrauchte Kleidung wird für junge Leute zum Statussymbol",
    text: "Was früher als altmodisch galt, ist heute angesagt: Immer mehr Jugendliche kaufen ihre Kleidung secondhand. Ein einzigartiges Stück vom Flohmarkt gilt als cooler als Massenware aus der Kette. Onlineplattformen für gebrauchte Mode wachsen rasant. Nebenbei, sagen die Käufer, schone man auch die Umwelt – ein willkommenes Argument.",
  },
];

/**
 * Titres DISTRACTEURS : plausibles mais ne correspondant à aucun texte.
 * Thématiquement proches pour rester crédibles (piège classique telc).
 */
export const LESEN_TEIL1_DISTRACTOR_TITLES: string[] = [
  "Elektroautos scheitern noch immer an fehlenden Ladesäulen",
  "Warum Wildbienen trotz aller Bemühungen weiter verschwinden",
  "Neue Elektrogeräte werden bewusst nur für kurze Zeit gebaut",
  "Fliegen bleibt für Kurzstrecken die beliebteste Reiseform",
  "Kinder verbringen täglich mehrere Stunden vor dem Bildschirm",
  "Supermärkte werfen weiterhin tonnenweise Gemüse weg",
  "Wohnungsnot in den Großstädten spitzt sich weiter zu",
  "Plastikverpackungen lassen sich kaum sinnvoll recyceln",
  "Der Beruf des Feuerwehrmanns wird endlich besser bezahlt",
  "Eintrittspreise für Konzerte steigen von Jahr zu Jahr",
  "Fremdsprachen verlernt man ohne regelmäßige Praxis schnell",
  "Billige Mode aus dem Ausland setzt die Hersteller unter Druck",
];
