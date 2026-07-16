import type { ExamContentBundle } from "@/types/question-content";

/**
 * Contenu de DÉMONSTRATION — examen "demo-b2".
 * Sert à développer et tester le moteur tant que l'admin (Sprint 10) et la
 * base PostgreSQL ne fournissent pas de vrais examens. Le fournisseur
 * lib/exam-content.ts est le seul à l'importer ; la bascule vers Prisma se
 * fera là, sans toucher aux composants.
 *
 * IMPORTANT : ce module ne contient PAS les clés de correction dans le
 * bundle servi au client — elles vivent dans l'export séparé
 * DEMO_B2_ANSWER_KEYS, consommé uniquement par le scoring (Sprint 8).
 */
export const DEMO_B2_CONTENT: ExamContentBundle = {
  examId: "demo-b2",
  title: "telc Deutsch B2 — Modelltest 1 (Demo)",
  level: "B2",
  parts: {
    /* ================= LESEN TEIL 1 — Überschriften zuordnen ================= */
    "lesen/teil-1": {
      type: "TITLE_MATCHING",
      shared: {
        instructions:
          "Lesen Sie zuerst die zehn Überschriften. Lesen Sie dann die fünf Texte und entscheiden Sie, welche Überschrift (a–j) am besten zu welchem Text (1–5) passt.",
        titles: [
          { id: "a", text: "Warum die innere Uhr aus dem Takt gerät" },
          { id: "b", text: "Gemüse vom Hochhausdach" },
          { id: "c", text: "Schlafstörungen bei Jugendlichen nehmen zu" },
          { id: "d", text: "Arbeiten von zu Hause: produktiver als gedacht" },
          { id: "e", text: "Neue Studie: Homeoffice macht einsam" },
          { id: "f", text: "Wertvolle Rohstoffe in alten Handys" },
          { id: "g", text: "Handyverbot an Schulen bleibt umstritten" },
          { id: "h", text: "Jugendliche lesen wieder mehr – digital" },
          { id: "i", text: "Stadtbewohner zieht es aufs Land" },
          { id: "j", text: "Bibliotheken kämpfen ums Überleben" },
        ],
      },
      questions: [
        {
          id: "l1-q1",
          position: 1,
          points: 5,
          content: {
            text: "Zweimal im Jahr werden die Uhren umgestellt – und jedes Mal klagen Millionen Menschen über Müdigkeit und Konzentrationsprobleme. Schlafforscher der Universität Basel haben nun nachgewiesen, dass der menschliche Biorhythmus bis zu zwei Wochen braucht, um sich an die neue Zeit anzupassen. Besonders betroffen sind Menschen, die sehr früh aufstehen müssen.",
          },
        },
        {
          id: "l1-q2",
          position: 2,
          points: 5,
          content: {
            text: "Auf dem Dach eines Bürogebäudes in Frankfurt wachsen Tomaten, Salat und Kräuter. Das Projekt „Dachgarten 21“ zeigt, dass Landwirtschaft mitten in der Großstadt möglich ist. Die Ernte wird an Restaurants im Viertel verkauft – kurze Wege, frische Ware. Inzwischen gibt es Wartelisten von Firmen, die ihre Dächer ebenfalls bepflanzen lassen wollen.",
          },
        },
        {
          id: "l1-q3",
          position: 3,
          points: 5,
          content: {
            text: "Viele Arbeitgeber befürchteten lange, dass ihre Beschäftigten zu Hause weniger leisten. Eine Langzeituntersuchung mit 1.200 Büroangestellten kommt zum gegenteiligen Ergebnis: Wer regelmäßig im Homeoffice arbeitet, erledigt Aufgaben im Schnitt schneller und macht weniger Fehler – vorausgesetzt, die Aufgaben sind klar definiert.",
          },
        },
        {
          id: "l1-q4",
          position: 4,
          points: 5,
          content: {
            text: "In deutschen Schubladen liegen schätzungsweise 200 Millionen ausgediente Mobiltelefone. Dabei stecken in jedem Gerät Gold, Silber, Kupfer und seltene Erden. Recyclingunternehmen fordern deshalb ein Pfandsystem: Wer sein altes Handy zurückgibt, soll Geld erhalten. So könnten wichtige Rohstoffe zurückgewonnen werden, statt ungenutzt zu verstauben.",
          },
        },
        {
          id: "l1-q5",
          position: 5,
          points: 5,
          content: {
            text: "Totgesagte leben länger: Entgegen aller Prognosen verbringen 14- bis 19-Jährige heute wieder mehr Zeit mit Büchern als noch vor fünf Jahren. Der Grund ist das Smartphone selbst – Lese-Apps und E-Books machen Literatur dort verfügbar, wo Jugendliche ohnehin sind. Gedruckte Bücher verlieren dagegen weiter an Bedeutung.",
          },
        },
      ],
    },

    /* ================= LESEN TEIL 2 — Detailverstehen ================= */
    "lesen/teil-2": {
      type: "MULTIPLE_CHOICE",
      shared: {
        instructions:
          "Lesen Sie zuerst den Text und dann die Aufgaben 6–10. Wählen Sie bei jeder Aufgabe die richtige Antwort (a, b oder c).",
        sourceText:
          "Die Vier-Tage-Woche – Modell mit Zukunft?\n\nSeit Januar testen 45 deutsche Unternehmen die Vier-Tage-Woche: Die Beschäftigten arbeiten vier statt fünf Tage, bei vollem Gehalt. Begleitet wird das Pilotprojekt von einem Forschungsteam der Universität Münster, das Arbeitszeit, Gesundheit und Produktivität der Teilnehmenden dokumentiert.\n\nDie Zwischenbilanz nach sechs Monaten fällt überwiegend positiv aus. Fast drei Viertel der Beschäftigten berichten, dass sie sich erholter fühlen und ihre Arbeit konzentrierter erledigen. Die Krankmeldungen gingen in den teilnehmenden Firmen um durchschnittlich 18 Prozent zurück. Auch die Unternehmen selbst ziehen ein positives Fazit: Die Produktivität blieb stabil oder stieg sogar leicht an, obwohl weniger Stunden gearbeitet wurde.\n\nAllerdings zeigt die Studie auch Grenzen des Modells. In Betrieben mit Kundenkontakt – etwa im Handel oder in der Pflege – ließ sich der freie Tag nur schwer organisieren. Einige Firmen mussten zusätzliches Personal einstellen, was die Kosten erhöhte. Und nicht alle Beschäftigten kommen mit der Verdichtung der Arbeit zurecht: Etwa jeder Zehnte gab an, sich an den vier Arbeitstagen gehetzter zu fühlen als zuvor.\n\nProjektleiterin Dr. Anna Behrens warnt deshalb vor pauschalen Erwartungen: „Die Vier-Tage-Woche ist kein Wundermittel. Sie funktioniert dort, wo Abläufe klar strukturiert sind und Führungskräfte bereit sind, Besprechungen und Berichtspflichten radikal zu kürzen.“ Ob aus dem Experiment ein Dauermodell wird, entscheiden die Unternehmen am Jahresende.",
      },
      questions: [
        {
          id: "l2-q1",
          position: 1,
          points: 5,
          content: {
            question: "Bei dem Pilotprojekt arbeiten die Beschäftigten …",
            options: [
              { id: "a", text: "vier Tage pro Woche und verdienen weniger." },
              { id: "b", text: "vier Tage pro Woche bei gleichem Gehalt." },
              { id: "c", text: "fünf Tage pro Woche mit kürzeren Arbeitszeiten." },
            ],
          },
        },
        {
          id: "l2-q2",
          position: 2,
          points: 5,
          content: {
            question: "Nach sechs Monaten zeigt sich, dass …",
            options: [
              { id: "a", text: "die Zahl der Krankmeldungen gesunken ist." },
              { id: "b", text: "die Produktivität deutlich gefallen ist." },
              { id: "c", text: "die meisten Beschäftigten unzufrieden sind." },
            ],
          },
        },
        {
          id: "l2-q3",
          position: 3,
          points: 5,
          content: {
            question: "Schwierigkeiten mit dem Modell gab es vor allem …",
            options: [
              { id: "a", text: "in Firmen ohne feste Arbeitszeiten." },
              { id: "b", text: "bei jüngeren Beschäftigten." },
              { id: "c", text: "in Bereichen mit direktem Kundenkontakt." },
            ],
          },
        },
        {
          id: "l2-q4",
          position: 4,
          points: 5,
          content: {
            question: "Etwa zehn Prozent der Beschäftigten …",
            options: [
              { id: "a", text: "möchten wieder fünf Tage arbeiten." },
              { id: "b", text: "fühlen sich an den Arbeitstagen stärker unter Druck." },
              { id: "c", text: "haben zusätzliches Personal gefordert." },
            ],
          },
        },
        {
          id: "l2-q5",
          position: 5,
          points: 5,
          content: {
            question: "Dr. Behrens ist der Meinung, dass die Vier-Tage-Woche …",
            options: [
              { id: "a", text: "nur unter bestimmten Bedingungen funktioniert." },
              { id: "b", text: "in allen Branchen eingeführt werden sollte." },
              { id: "c", text: "am Jahresende gesetzlich geregelt wird." },
            ],
          },
        },
      ],
    },

    /* ================= LESEN TEIL 3 — Anzeigen zuordnen ================= */
    "lesen/teil-3": {
      type: "AD_MATCHING",
      shared: {
        instructions:
          "Lesen Sie die Situationen 11–20 und die Anzeigen A–L. Finden Sie für jede Situation die passende Anzeige. Jede Anzeige kann nur einmal gewählt werden. Gibt es zu einer Situation keine passende Anzeige, wählen Sie X.",
        ads: [
          { key: "A", text: "Sprachschule LinguaPlus: Intensivkurse Deutsch B2/C1, abends und samstags, kleine Gruppen, Prüfungsvorbereitung telc und Goethe." },
          { key: "B", text: "Umzüge Krause – schnell, versichert, fair. Auch Kleintransporte und Möbelmontage. Kostenlose Besichtigung." },
          { key: "C", text: "Fahrradwerkstatt „Speiche“: Reparaturen aller Marken, Inspektion ab 39 €, gebrauchte Räder mit Garantie." },
          { key: "D", text: "Nachhilfe-Institut Lernwerk: Mathematik, Physik, Chemie für Klasse 5–13. Einzelunterricht bei Ihnen zu Hause." },
          { key: "E", text: "Café Morgenrot sucht Servicekraft (m/w/d) in Teilzeit, Wochenenddienst, Erfahrung erwünscht, faire Bezahlung." },
          { key: "F", text: "Tierpension Waldblick: liebevolle Betreuung für Hunde und Katzen, auch über die Feiertage. Abhol-Service möglich." },
          { key: "G", text: "IT-Service Menzel: Hilfe bei Computerproblemen, Datenrettung, Einrichtung von Druckern und WLAN – auch für Senioren." },
          { key: "H", text: "Yoga-Studio Balance: Anfängerkurse jeden Montag, Probestunde gratis, Kurse werden von Krankenkassen bezuschusst." },
          { key: "I", text: "2-Zimmer-Wohnung, 54 m², Altbau, Balkon, ab 1. September, 780 € warm, nur an Nichtraucher." },
          { key: "J", text: "Musikschule Tonleiter: Gitarren- und Klavierunterricht für Kinder und Erwachsene, Leihinstrumente vorhanden." },
          { key: "K", text: "Steuerberatung Wolf & Partner: Erstberatung für Selbstständige und Existenzgründer zum Festpreis." },
          { key: "L", text: "Reisebüro Fernweh: Last-Minute-Angebote ans Mittelmeer, Gruppenreisen 50+, persönliche Beratung." },
        ],
      },
      questions: [
        { id: "l3-q1", position: 1, points: 2.5, content: { situation: "Ihre Freundin möchte sich auf die telc-Prüfung B2 vorbereiten, kann aber nur nach der Arbeit lernen." } },
        { id: "l3-q2", position: 2, points: 2.5, content: { situation: "Sie ziehen nächsten Monat um und brauchen jemanden, der Ihre Möbel transportiert und aufbaut." } },
        { id: "l3-q3", position: 3, points: 2.5, content: { situation: "Der Sohn Ihres Kollegen hat Probleme in Mathematik und braucht Unterstützung – am liebsten zu Hause." } },
        { id: "l3-q4", position: 4, points: 2.5, content: { situation: "Ein Bekannter hat sich selbstständig gemacht und sucht professionelle Hilfe bei seiner ersten Steuererklärung." } },
        { id: "l3-q5", position: 5, points: 2.5, content: { situation: "Sie fahren über Weihnachten weg und suchen eine Betreuung für Ihre Katze." } },
        { id: "l3-q6", position: 6, points: 2.5, content: { situation: "Ihre Nachbarin, 72, bekommt ihren neuen Drucker nicht ans WLAN angeschlossen." } },
        { id: "l3-q7", position: 7, points: 2.5, content: { situation: "Eine Studentin sucht dringend ein möbliertes Zimmer in einer Wohngemeinschaft für ein Semester." } },
        { id: "l3-q8", position: 8, points: 2.5, content: { situation: "Ihr Fahrrad ist kaputt, und Sie möchten es reparieren lassen, ohne ein neues zu kaufen." } },
        { id: "l3-q9", position: 9, points: 2.5, content: { situation: "Ihre Tochter (8) möchte ein Instrument lernen, Sie möchten aber noch kein eigenes Instrument kaufen." } },
        { id: "l3-q10", position: 10, points: 2.5, content: { situation: "Ein Freund sucht einen Vollzeitjob als Koch in einem Restaurant." } },
      ],
    },

    /* ============ SPRACHBAUSTEINE TEIL 1 — Grammatik (a/b/c je Lücke) ============ */
    "sprachbausteine/teil-1": {
      type: "CLOZE_DROPDOWN",
      shared: {
        instructions:
          "Lesen Sie den folgenden Brief und entscheiden Sie, welches Wort (a, b oder c) in die Lücken 21–30 passt.",
        text: "Sehr geehrte Damen und Herren,\n\nam 3. Mai habe ich in Ihrem Online-Shop einen Bürostuhl bestellt, {{1}} bereits nach zwei Wochen kaputtgegangen ist. Die Rückenlehne lässt sich nicht mehr verstellen, {{2}} ich den Stuhl kaum noch benutzen kann.\n\nIch habe mich daraufhin telefonisch {{3}} Ihren Kundendienst gewandt. Dort wurde mir versprochen, {{4}} ich innerhalb von drei Tagen Ersatz erhalten würde. {{5}} sind mehr als zwei Wochen vergangen, ohne dass etwas geschehen ist.\n\n{{6}} Ihrer Website werben Sie mit schnellem und zuverlässigem Service. Von dieser Zuverlässigkeit habe ich bisher leider wenig {{7}}. Ich fordere Sie deshalb auf, mir {{8}} zum 30. Juni einen neuen Stuhl zu liefern oder den Kaufpreis zu erstatten.\n\nSollte ich bis zu diesem Termin nichts von Ihnen {{9}}, sehe ich mich gezwungen, rechtliche Schritte einzuleiten. Ich hoffe jedoch, dass wir die Angelegenheit {{10}} Weise lösen können.\n\nMit freundlichen Grüßen\nSandra Köhler",
      },
      questions: [
        { id: "sb1-q1", position: 1, points: 1.5, content: { gapIndex: 1, options: [
          { id: "a", text: "der" }, { id: "b", text: "die" }, { id: "c", text: "das" } ] } },
        { id: "sb1-q2", position: 2, points: 1.5, content: { gapIndex: 2, options: [
          { id: "a", text: "sodass" }, { id: "b", text: "damit" }, { id: "c", text: "denn" } ] } },
        { id: "sb1-q3", position: 3, points: 1.5, content: { gapIndex: 3, options: [
          { id: "a", text: "bei" }, { id: "b", text: "an" }, { id: "c", text: "zu" } ] } },
        { id: "sb1-q4", position: 4, points: 1.5, content: { gapIndex: 4, options: [
          { id: "a", text: "ob" }, { id: "b", text: "dass" }, { id: "c", text: "weil" } ] } },
        { id: "sb1-q5", position: 5, points: 1.5, content: { gapIndex: 5, options: [
          { id: "a", text: "Seitdem" }, { id: "b", text: "Deswegen" }, { id: "c", text: "Obwohl" } ] } },
        { id: "sb1-q6", position: 6, points: 1.5, content: { gapIndex: 6, options: [
          { id: "a", text: "Auf" }, { id: "b", text: "In" }, { id: "c", text: "An" } ] } },
        { id: "sb1-q7", position: 7, points: 1.5, content: { gapIndex: 7, options: [
          { id: "a", text: "gesehen" }, { id: "b", text: "gemerkt" }, { id: "c", text: "gekannt" } ] } },
        { id: "sb1-q8", position: 8, points: 1.5, content: { gapIndex: 8, options: [
          { id: "a", text: "bis" }, { id: "b", text: "ab" }, { id: "c", text: "seit" } ] } },
        { id: "sb1-q9", position: 9, points: 1.5, content: { gapIndex: 9, options: [
          { id: "a", text: "hören" }, { id: "b", text: "gehört" }, { id: "c", text: "hörte" } ] } },
        { id: "sb1-q10", position: 10, points: 1.5, content: { gapIndex: 10, options: [
          { id: "a", text: "auf gütlichem" }, { id: "b", text: "auf gütliche" }, { id: "c", text: "auf gütlicher" } ] } },
      ],
    },

    /* ============ SPRACHBAUSTEINE TEIL 2 — Wortschatz (Wortbank A–O) ============ */
    "sprachbausteine/teil-2": {
      type: "CLOZE_DROPDOWN",
      shared: {
        instructions:
          "Lesen Sie den folgenden Text und entscheiden Sie, welches Wort aus dem Kasten (A–O) in die Lücken 31–40 passt. Jedes Wort passt nur einmal.",
        wordBank: [
          { id: "A", text: "angeboten" },
          { id: "B", text: "angenommen" },
          { id: "C", text: "besuchen" },
          { id: "D", text: "dazu" },
          { id: "E", text: "erklären" },
          { id: "F", text: "gewöhnen" },
          { id: "G", text: "kaum" },
          { id: "H", text: "obwohl" },
          { id: "I", text: "selten" },
          { id: "J", text: "übrig" },
          { id: "K", text: "zurechtfinden" },
          { id: "L", text: "allerdings" },
          { id: "M", text: "endlich" },
          { id: "N", text: "verschieben" },
          { id: "O", text: "deshalb" },
        ],
        text: "Liebe Carola,\n\nendlich komme ich {{1}}, Dir zu schreiben – die letzten Wochen waren ziemlich turbulent. Wie Du weißt, habe ich zum 1. Juni eine neue Stelle in Leipzig {{2}}. Der Anfang war nicht leicht: neue Kollegen, neue Aufgaben und eine Stadt, in der ich mich erst {{3}} musste.\n\nIch habe {{4}} großes Glück mit meiner Wohnung gehabt. Sie liegt zentral, ist hell und trotzdem bezahlbar – so etwas findet man wirklich {{5}}. Meine Nachbarn haben mir beim Einzug sogar ihre Hilfe {{6}}.\n\nDie Arbeit selbst macht mir viel Spaß, {{7}} ich anfangs Zweifel hatte, ob die Entscheidung richtig war. Mein Team ist nett, und meine Chefin nimmt sich viel Zeit, mir alles zu {{8}}.\n\nWann kommst Du mich denn {{9}}? Im Juli habe ich noch ein paar Tage Urlaub {{10}}. Gib einfach Bescheid!\n\nHerzliche Grüße\nMiriam",
      },
      questions: [
        { id: "sb2-q1", position: 1, points: 1.5, content: { gapIndex: 1, options: [] } },
        { id: "sb2-q2", position: 2, points: 1.5, content: { gapIndex: 2, options: [] } },
        { id: "sb2-q3", position: 3, points: 1.5, content: { gapIndex: 3, options: [] } },
        { id: "sb2-q4", position: 4, points: 1.5, content: { gapIndex: 4, options: [] } },
        { id: "sb2-q5", position: 5, points: 1.5, content: { gapIndex: 5, options: [] } },
        { id: "sb2-q6", position: 6, points: 1.5, content: { gapIndex: 6, options: [] } },
        { id: "sb2-q7", position: 7, points: 1.5, content: { gapIndex: 7, options: [] } },
        { id: "sb2-q8", position: 8, points: 1.5, content: { gapIndex: 8, options: [] } },
        { id: "sb2-q9", position: 9, points: 1.5, content: { gapIndex: 9, options: [] } },
        { id: "sb2-q10", position: 10, points: 1.5, content: { gapIndex: 10, options: [] } },
      ],
    },

    /* ================= HÖREN — Richtig/Falsch, Audio einmalig ================= */
    "hoeren/teil-1": {
      type: "MULTIPLE_CHOICE",
      shared: {
        instructions:
          "Sie hören nun fünf kurze Texte. Sie hören diese Texte nur EINMAL. Entscheiden Sie beim Hören, ob die Aussagen 41–45 richtig oder falsch sind.",
        audioUrl: "/audio/demo/hoeren-teil-1.wav",
      },
      questions: [
        { id: "h1-q1", position: 1, points: 3.75, content: { question: "Die Stadtbibliothek ist ab sofort auch sonntags geöffnet.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h1-q2", position: 2, points: 3.75, content: { question: "Der Verkehrshinweis betrifft die Autobahn A9 in Richtung München.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h1-q3", position: 3, points: 3.75, content: { question: "In dem Radiobeitrag geht es um gesunde Ernährung am Arbeitsplatz.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h1-q4", position: 4, points: 3.75, content: { question: "Der Wetterbericht kündigt für das Wochenende Sonnenschein an.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h1-q5", position: 5, points: 3.75, content: { question: "Die Durchsage informiert über eine Verspätung des ICE nach Hamburg.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
      ],
    },
    "hoeren/teil-2": {
      type: "MULTIPLE_CHOICE",
      shared: {
        instructions:
          "Sie hören nun ein Interview. Sie hören das Interview nur EINMAL. Entscheiden Sie beim Hören, ob die Aussagen 46–55 richtig oder falsch sind.",
        audioUrl: "/audio/demo/hoeren-teil-2.wav",
      },
      questions: [
        { id: "h2-q1", position: 1, points: 3.75, content: { question: "Frau Dr. Sommer arbeitet seit über zwanzig Jahren als Schlafforscherin.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h2-q2", position: 2, points: 3.75, content: { question: "Die meisten Erwachsenen schlafen laut der Studie weniger als sieben Stunden.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h2-q3", position: 3, points: 3.75, content: { question: "Schichtarbeit hat nach Ansicht der Expertin kaum Einfluss auf die Gesundheit.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h2-q4", position: 4, points: 3.75, content: { question: "Ein kurzer Mittagsschlaf kann die Konzentration verbessern.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h2-q5", position: 5, points: 3.75, content: { question: "Frau Dr. Sommer empfiehlt, das Smartphone mit ins Schlafzimmer zu nehmen.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h2-q6", position: 6, points: 3.75, content: { question: "Koffein am Nachmittag kann den Schlaf noch am Abend stören.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h2-q7", position: 7, points: 3.75, content: { question: "Regelmäßige Schlafenszeiten sind wichtiger als die Schlafdauer.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h2-q8", position: 8, points: 3.75, content: { question: "Die Expertin hält Schlafmittel für eine gute Dauerlösung.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h2-q9", position: 9, points: 3.75, content: { question: "Sport am späten Abend hilft den meisten Menschen beim Einschlafen.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h2-q10", position: 10, points: 3.75, content: { question: "Frau Dr. Sommer plant ein Buch für junge Eltern zu schreiben.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
      ],
    },
    "hoeren/teil-3": {
      type: "MULTIPLE_CHOICE",
      shared: {
        instructions:
          "Sie hören nun fünf kurze Durchsagen und Mitteilungen. Sie hören jeden Text nur EINMAL. Entscheiden Sie beim Hören, ob die Aussagen 56–60 richtig oder falsch sind.",
        audioUrl: "/audio/demo/hoeren-teil-3.wav",
      },
      questions: [
        { id: "h3-q1", position: 1, points: 3.75, content: { question: "Die Reisenden nach Basel müssen heute den Bus nehmen.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h3-q2", position: 2, points: 3.75, content: { question: "Das Sonderangebot im Kaufhaus gilt nur noch bis Samstag.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h3-q3", position: 3, points: 3.75, content: { question: "Der Anrufer möchte seinen Termin auf Donnerstag verschieben.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h3-q4", position: 4, points: 3.75, content: { question: "Das Fußballspiel am Sonntag beginnt eine Stunde später als geplant.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
        { id: "h3-q5", position: 5, points: 3.75, content: { question: "Die Apotheke am Marktplatz bleibt wegen Renovierung zwei Wochen geschlossen.", options: [ { id: "richtig", text: "Richtig" }, { id: "falsch", text: "Falsch" } ] } },
      ],
    },

    /* ================= SCHREIBEN — eine von zwei Aufgaben ================= */
    "schreiben/aufgabe-a": {
      type: "WRITING",
      shared: {},
      questions: [
        {
          id: "sw-a",
          position: 1,
          points: 45,
          content: {
            prompt:
              "Sie haben an der Volkshochschule einen Computerkurs besucht, mit dem Sie sehr unzufrieden waren: Der Kurs entsprach nicht der Beschreibung im Programmheft. Schreiben Sie einen Brief an die Volkshochschule. Vergessen Sie nicht Anrede und Gruß.",
            bulletPoints: [
              "Grund Ihres Schreibens",
              "was Ihnen an dem Kurs nicht gefallen hat (mindestens zwei Punkte)",
              "Vorschlag, wie die Volkshochschule das Problem lösen könnte",
              "was Sie erwarten, falls keine Lösung gefunden wird",
            ],
            minWords: 150,
          },
        },
      ],
    },
    "schreiben/aufgabe-b": {
      type: "WRITING",
      shared: {},
      questions: [
        {
          id: "sw-b",
          position: 1,
          points: 45,
          content: {
            prompt:
              "Sie möchten im Sommer einen dreiwöchigen Sprachkurs im Ausland machen und haben im Internet das Angebot der Sprachschule „Lingua Viva“ gefunden. Einige Informationen fehlen jedoch. Schreiben Sie eine E-Mail an die Sprachschule. Vergessen Sie nicht Anrede und Gruß.",
            bulletPoints: [
              "warum Sie schreiben",
              "Ihre bisherigen Sprachkenntnisse",
              "Fragen zu Unterkunft und Freizeitangebot",
              "Bitte um Informationen zu Preisen und Anmeldung",
            ],
            minWords: 150,
          },
        },
      ],
    },
  },
};

/**
 * Clés de correction du contenu de démonstration.
 * CONSOMMÉ UNIQUEMENT PAR LE SCORING (Sprint 8) — ne jamais importer
 * depuis un composant ou une page : ces valeurs ne doivent pas atteindre
 * le client pendant l'épreuve.
 */
export const DEMO_B2_ANSWER_KEYS: Record<string, string> = {
  "l1-q1": "a",
  "l1-q2": "b",
  "l1-q3": "d",
  "l1-q4": "f",
  "l1-q5": "h",
  "l2-q1": "b",
  "l2-q2": "a",
  "l2-q3": "c",
  "l2-q4": "b",
  "l2-q5": "a",
  "l3-q1": "A",
  "l3-q2": "B",
  "l3-q3": "D",
  "l3-q4": "K",
  "l3-q5": "F",
  "l3-q6": "G",
  "l3-q7": "X", // aucune annonce ne propose un zimmer en WG meublé
  "l3-q8": "C",
  "l3-q9": "J",
  "l3-q10": "X", // le café cherche une servicekraft à temps partiel, pas un cuisinier
  "sb1-q1": "a",
  "sb1-q2": "a",
  "sb1-q3": "b",
  "sb1-q4": "b",
  "sb1-q5": "a",
  "sb1-q6": "a",
  "sb1-q7": "b",
  "sb1-q8": "a",
  "sb1-q9": "a",
  "sb1-q10": "b",
  "sb2-q1": "D", // komme ich dazu
  "sb2-q2": "B", // eine Stelle angenommen
  "sb2-q3": "K", // sich zurechtfinden
  "sb2-q4": "L", // allerdings
  "sb2-q5": "I", // selten
  "sb2-q6": "A", // Hilfe angeboten
  "sb2-q7": "H", // obwohl
  "sb2-q8": "E", // erklären
  "sb2-q9": "C", // besuchen
  "sb2-q10": "J", // Urlaub übrig
  // Hören — clés arbitraires tant que les audios sont des placeholders.
  "h1-q1": "falsch", "h1-q2": "richtig", "h1-q3": "richtig",
  "h1-q4": "falsch", "h1-q5": "richtig",
  "h2-q1": "richtig", "h2-q2": "richtig", "h2-q3": "falsch",
  "h2-q4": "richtig", "h2-q5": "falsch", "h2-q6": "richtig",
  "h2-q7": "falsch", "h2-q8": "falsch", "h2-q9": "falsch",
  "h2-q10": "richtig",
  "h3-q1": "richtig", "h3-q2": "falsch", "h3-q3": "richtig",
  "h3-q4": "falsch", "h3-q5": "richtig",
  // Schreiben (sw-a / sw-b) : pas de clé — correction manuelle (v1),
  // conformément à l'examen réel.
};
