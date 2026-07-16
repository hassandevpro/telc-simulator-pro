/**
 * BANQUE Lesen Teil 3 — Zuordnung (AD_MATCHING). Chaque « set » est un
 * ensemble COHÉRENT et ORIGINAL : 12 petites annonces + 10 situations, avec
 * la clé de chaque situation (le `tag` interne d'une annonce, ou "X" quand
 * aucune annonce ne convient). Format telc : 8 situations trouvent leur
 * annonce, 2 restent sans réponse (X), et 4 annonces servent de distracteurs.
 *
 * Le moteur (parts/lesen-teil-3.ts) tire un set, mélange les 12 annonces et
 * leur attribue A–L, mélange l'ordre des 10 situations, puis recalcule les
 * clés — deux examens issus du même set n'ont ni le même ordre ni les mêmes
 * lettres.
 */
export interface AdMatchingSet {
  theme: string;
  /** `tag` : identifiant interne stable ; `text` : l'annonce affichée. */
  ads: { tag: string; text: string }[];
  /** `answer` : tag d'une annonce ci-dessus, ou "X". */
  situations: { text: string; answer: string }[];
}

export const LESEN_TEIL3_SETS: AdMatchingSet[] = [
  {
    theme: "vhs-kurse",
    ads: [
      { tag: "kochkurs", text: "Italienisch kochen: An vier Donnerstagabenden bereiten wir gemeinsam frische Pasta und Saucen zu. Zutaten inklusive, Anmeldung bis Freitag im Sekretariat." },
      { tag: "laufgruppe", text: "Laufen für Anfänger: Wir treffen uns sonntagmorgens im Stadtpark. Kein Leistungsdruck, ein Tempo für Einsteiger. Einfach vorbeikommen." },
      { tag: "naehkurs", text: "Nähen lernen: Bring alte Kleidung mit und lerne, sie zu reparieren oder umzuändern. Maschinen sind vorhanden. Kompakter Wochenendworkshop." },
      { tag: "gitarre", text: "Gitarre für Erwachsene: Erfahrener Lehrer gibt Einzelstunden für absolute Anfänger. Flexible Termine am Nachmittag, die erste Stunde ist kostenlos." },
      { tag: "fotokurs", text: "Fotografie am Wochenende: Wir ziehen mit der Kamera durch die Altstadt und üben, im richtigen Licht zu fotografieren. Eigene Kamera nötig." },
      { tag: "spanisch", text: "Spanisch-Stammtisch: Jeden zweiten Mittwoch reden wir bei einem Getränk nur auf Spanisch. Für alle, die ihre Kenntnisse nicht einrosten lassen wollen." },
      { tag: "yoga", text: "Yoga vor der Arbeit: Sanfte Übungen dienstags und donnerstags um 7 Uhr, damit der Tag entspannt beginnt. Matten werden gestellt." },
      { tag: "schach", text: "Schach für Jugendliche: Unser Verein sucht neue Mitglieder zwischen 12 und 16 Jahren. Treffen freitags im Jugendzentrum, Anfänger willkommen." },
      { tag: "kindermalen", text: "Malen für Kinder: Samstagvormittags experimentieren wir mit Farben und Formen. Für Kinder von 6 bis 10 Jahren, Material inklusive." },
      { tag: "chor", text: "Offener Chor: Wir singen moderne Lieder und suchen Stimmen jeder Art. Keine Vorkenntnisse, kein Vorsingen. Probe montags am frühen Abend." },
      { tag: "senioren-handy", text: "Smartphone-Sprechstunde: Ehrenamtliche helfen älteren Menschen geduldig beim Umgang mit Handy und Tablet. Jeden Dienstag in der Bibliothek." },
      { tag: "garten", text: "Gemeinschaftsgarten: Wer gern draußen arbeitet, ist willkommen. Wir teilen Beete, Werkzeug und die Ernte. Treffen samstags am Vormittag." },
    ],
    situations: [
      { text: "Herr Klein möchte nach der Pensionierung endlich lernen, mit seinem neuen Handy Fotos an die Enkel zu verschicken.", answer: "senioren-handy" },
      { text: "Frau Adan sucht für ihre siebenjährige Tochter eine kreative Beschäftigung am Samstagvormittag.", answer: "kindermalen" },
      { text: "Tobias hat noch nie ein Instrument gespielt, würde aber gern nachmittags mit dem Gitarrespielen beginnen.", answer: "gitarre" },
      { text: "Lena möchte einen Tanzkurs besuchen, um am Wochenende sicherer ausgehen zu können.", answer: "X" },
      { text: "Ein Student will sein Spanisch im lockeren Gespräch üben, ohne dafür Geld auszugeben.", answer: "spanisch" },
      { text: "Frau Ott möchte in einem Kurs von Grund auf das Schwimmen erlernen.", answer: "X" },
      { text: "Murat interessiert sich fürs Kochen und würde gern lernen, italienische Gerichte selbst zuzubereiten.", answer: "kochkurs" },
      { text: "Die 14-jährige Nele sucht einen Verein, in dem sie in Ruhe strategisch denken und spielen kann.", answer: "schach" },
      { text: "Herr Voss hat viele Hemden, die nicht mehr passen, und möchte sie selbst enger nähen.", answer: "naehkurs" },
      { text: "Sophie sucht eine Aufgabe an der frischen Luft und teilt die Ernte gern mit anderen.", answer: "garten" },
    ],
  },
  {
    theme: "kleinanzeigen",
    ads: [
      { tag: "umzugshilfe", text: "Kräftige Hände gesucht? Zwei Studenten helfen samstags beim Umzug, tragen Möbel und Kisten. Transporter kann gegen Aufpreis gestellt werden." },
      { tag: "nachhilfe-mathe", text: "Mathe-Nachhilfe: Lehramtsstudentin unterstützt Schüler der Klassen 5 bis 10 geduldig bei Hausaufgaben und Prüfungsvorbereitung. Auch online möglich." },
      { tag: "hundebetreuung", text: "Ich gehe mit Ihrem Hund Gassi, während Sie arbeiten. Erfahren und zuverlässig, gern auch mehrmals pro Woche im Stadtteil Nord." },
      { tag: "fahrrad", text: "Gut erhaltenes Damenrad, 7 Gänge, mit Korb und Licht, an Selbstabholer abzugeben. Kleine Gebrauchsspuren, fährt einwandfrei." },
      { tag: "gitarre-verkauf", text: "Akustikgitarre für Anfänger günstig abzugeben, inklusive Tasche und Stimmgerät. Kaum gespielt, da das Interesse leider nachgelassen hat." },
      { tag: "wohnungsputz", text: "Zuverlässige Reinigungskraft übernimmt wöchentlich das Putzen Ihrer Wohnung. Faire Bezahlung, eigene Anfahrt, Referenzen vorhanden." },
      { tag: "babysitting", text: "Erfahrene Babysitterin passt abends auf Ihre Kinder auf, damit Sie in Ruhe ausgehen können. Auch am Wochenende, Nichtraucherin." },
      { tag: "gartenarbeit", text: "Rasen mähen, Hecke schneiden, Laub harken: Ich erledige Ihre Gartenarbeit im Frühjahr und Herbst. Werkzeug bringe ich selbst mit." },
      { tag: "computerhilfe", text: "PC langsam oder Drucker streikt? Ich komme vorbei, richte Ihren Computer ein und erkläre alles verständlich. Auch für Einsteiger." },
      { tag: "moebel", text: "Massiver Esstisch aus Eiche mit vier Stühlen zu verkaufen. Wegen Umzug abzugeben, Abholung bis Monatsende erwünscht." },
      { tag: "musikunterricht", text: "Klavierlehrerin gibt Unterricht für Kinder und Erwachsene bei Ihnen zu Hause. Erste Probestunde unverbindlich und kostenlos." },
      { tag: "fahrgemeinschaft", text: "Suche Mitfahrer für die tägliche Fahrt nach Frankfurt, Abfahrt 7:30 Uhr. Kosten werden geteilt, Rückfahrt nach Absprache." },
    ],
    situations: [
      { text: "Frau Sommer arbeitet tagsüber und sucht jemanden, der mit ihrem Hund spazieren geht.", answer: "hundebetreuung" },
      { text: "Ein Vater sucht Unterstützung, damit sein Sohn in der Mathematik wieder mitkommt.", answer: "nachhilfe-mathe" },
      { text: "Herr Demir zieht in eine neue Wohnung und braucht am Samstag Hilfe beim Tragen der Möbel.", answer: "umzugshilfe" },
      { text: "Familie Kraus möchte am Samstagabend ins Theater und sucht eine Betreuung für die Kinder.", answer: "babysitting" },
      { text: "Frau Ludwig braucht für einen wichtigen Termin dringend einen professionellen Haarschnitt.", answer: "X" },
      { text: "Ein Berufspendler möchte die Fahrtkosten nach Frankfurt senken und teilt sich gern ein Auto.", answer: "fahrgemeinschaft" },
      { text: "Herr Peic hat keine Zeit für den Garten und sucht jemanden, der die Hecke schneidet.", answer: "gartenarbeit" },
      { text: "Frau Nowak möchte ihren Kindern zu Hause das Klavierspielen beibringen lassen.", answer: "musikunterricht" },
      { text: "Ein junger Mann sucht ein günstiges, fahrbereites Fahrrad für den Weg zur Uni.", answer: "fahrrad" },
      { text: "Herr Baumann sucht einen Handwerker, der ihm ein Regal an die Wand montiert.", answer: "X" },
    ],
  },
];
