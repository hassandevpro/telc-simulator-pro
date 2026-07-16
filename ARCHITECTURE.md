# TELC Simulator Pro — Architecture Technique

**Phase 1 : Conception complète de l'architecture**
Version 1.0 — Document de référence avant toute génération de code.

---

## 1. Principes directeurs

Quatre décisions structurantes gouvernent tout le projet. Chaque choix ultérieur en découle.

**1. Moteur d'examen piloté par configuration (config-driven).**
La structure d'un examen TELC B1/B2 est fixe et officielle : sections, Teile, nombre d'items, barème, durées. Cette structure ne doit JAMAIS être codée en dur dans les composants. Elle vit dans un fichier de configuration unique (`src/config/exam-structure.ts`) qui décrit l'examen comme des données. Les composants ne font que rendre cette configuration. Conséquence : ajouter le B1 quand le B2 existe = ajouter un objet de config, zéro nouveau composant.

**2. Séparation stricte moteur / contenu.**
Le *moteur* (timer, navigation, autosave, verrouillage audio, scoring) est générique. Le *contenu* (textes, questions, audios) est de la donnée en base. L'admin crée du contenu, jamais du code.

**3. Le temps fait autorité côté serveur.**
Le timer affiché au candidat est calculé à partir de `startedAt + durée` stockés en base (et en LocalStorage en mode dégradé), jamais à partir d'un compteur client décrémenté. Un refresh, un crash, une fermeture d'onglet : le temps continue de courir, exactement comme dans un vrai centre d'examen. C'est ce qui rend le timer « impossible à réinitialiser accidentellement ».

**4. LocalStorage d'abord, PostgreSQL ensuite — via une couche d'abstraction.**
Toute persistance de session passe par une interface `SessionRepository`. Implémentation v1 : LocalStorage. Implémentation v2 : API + PostgreSQL. Le code des composants ne change pas quand on bascule.

---

## 2. Structure de dossiers complète

```
telc-simulator-pro/
├── prisma/
│   ├── schema.prisma          # Modèle de données complet
│   └── seed.ts                # Examen B2 de démonstration
│
├── public/
│   └── audio/
│       └── sound-check.mp3    # Audio du test casque (seul audio statique)
│
├── src/
│   ├── app/                              # App Router — routes uniquement, zéro logique métier
│   │   ├── (marketing)/                  # Groupe : pages publiques
│   │   │   ├── page.tsx                  # Landing
│   │   │   └── pricing/page.tsx          # Student / Center / Premium
│   │   │
│   │   ├── (auth)/                       # Groupe : layout épuré sans navigation
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   │
│   │   ├── (dashboard)/                  # Groupe : espace candidat connecté
│   │   │   ├── dashboard/page.tsx        # Examens disponibles, sessions en cours
│   │   │   └── results/
│   │   │       ├── page.tsx              # Historique
│   │   │       └── [sessionId]/page.tsx  # Détail d'un résultat
│   │   │
│   │   ├── (exam)/                       # Groupe : MODE EXAMEN — layout isolé
│   │   │   ├── layout.tsx                # Pas de menu produit, pas de liens sortants
│   │   │   ├── audio-check/page.tsx      # Test casque obligatoire
│   │   │   └── session/[sessionId]/
│   │   │       ├── layout.tsx            # ExamShell : nav sticky + timer global
│   │   │       ├── lesen/[teil]/page.tsx
│   │   │       ├── hoeren/[teil]/page.tsx
│   │   │       ├── sprachbausteine/[teil]/page.tsx
│   │   │       ├── schreiben/page.tsx    # Aufgabe A + B sur la même page
│   │   │       └── abgabe/page.tsx       # Remise finale + confirmation
│   │   │
│   │   ├── (admin)/
│   │   │   └── admin/
│   │   │       ├── layout.tsx            # Garde de rôle ADMIN
│   │   │       ├── page.tsx              # Statistiques
│   │   │       ├── exams/...             # CRUD examens
│   │   │       ├── questions/...         # CRUD questions par type
│   │   │       ├── audio/...             # Upload et gestion audio
│   │   │       └── users/...             # Gestion utilisateurs
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── sessions/...              # Création, autosave, soumission
│   │       ├── exams/...
│   │       └── admin/...
│   │
│   ├── components/
│   │   ├── ui/                    # Primitives neutres, sans logique métier
│   │   │   ├── Button.tsx
│   │   │   ├── Select.tsx         # Le dropdown officiel (base de tous les Teile à menus)
│   │   │   ├── Card.tsx           # Bordure fine, fond blanc, aucun shadow
│   │   │   ├── Modal.tsx          # Confirmations (remise, audio)
│   │   │   └── ProgressBar.tsx
│   │   │
│   │   ├── exam/                  # Composants du MOTEUR d'examen
│   │   │   ├── ExamShell.tsx      # Assemble nav + timer + zone de contenu
│   │   │   ├── ExamNav.tsx        # Nav sticky 2 niveaux (sections / Teile)
│   │   │   ├── GlobalTimer.tsx    # Affichage mm:ss, états visuels < 10 min / < 5 min
│   │   │   ├── PartNavigation.tsx # Boutons Zurück / Weiter
│   │   │   ├── AudioPlayer.tsx    # Lecture unique, sans seek, sans pause
│   │   │   ├── LockOverlay.tsx    # Verrouillage nav pendant lecture audio
│   │   │   └── SubmitDialog.tsx   # Confirmation de remise
│   │   │
│   │   ├── questions/             # UN composant par TYPE de question (pas par Teil)
│   │   │   ├── QuestionRenderer.tsx      # Dispatch selon question.type
│   │   │   ├── TitleMatching.tsx         # Lesen T1 : 5 textes / 10 titres
│   │   │   ├── MultipleChoice.tsx        # Lesen T2, Hören, Sprachbausteine T2
│   │   │   ├── AdMatching.tsx            # Lesen T3 : A–L + X
│   │   │   ├── ClozeDropdown.tsx         # Sprachbausteine T1 : menus dans le texte
│   │   │   └── WritingTask.tsx           # Schreiben : éditeur + compteur de mots
│   │   │
│   │   ├── results/
│   │   │   ├── ScoreSummary.tsx
│   │   │   ├── SectionBreakdown.tsx
│   │   │   └── PassProbability.tsx
│   │   │
│   │   └── admin/                 # Formulaires de création par type de question
│   │
│   ├── config/
│   │   ├── exam-structure.ts      # LA source de vérité : sections, Teile, items, points, durées
│   │   ├── scoring.ts             # Barème officiel telc, seuils de réussite
│   │   └── design-tokens.ts       # Couleurs, espacements (gris officiels)
│   │
│   ├── stores/                    # Zustand — état client du mode examen
│   │   ├── examSessionStore.ts    # Réponses, position courante, statut
│   │   ├── timerStore.ts          # startedAt, durée, calcul du restant
│   │   └── audioStore.ts          # audiosJoués[], verrouillage navigation
│   │
│   ├── hooks/
│   │   ├── useExamTimer.ts        # Tick 1s, dérivé de timerStore, déclenche l'expiration
│   │   ├── useAutosave.ts         # Debounce 2s → repository
│   │   ├── useAudioOnce.ts        # Garantit lecture unique + verrouillage
│   │   ├── useWordCount.ts        # Compteur Schreiben
│   │   └── useBeforeUnload.ts     # Avertissement fermeture pendant session
│   │
│   ├── lib/
│   │   ├── db.ts                  # Client Prisma singleton
│   │   ├── auth.ts                # Config NextAuth + helpers de rôle
│   │   ├── repository/
│   │   │   ├── session-repository.ts        # Interface
│   │   │   ├── local-storage.repository.ts  # Implémentation v1
│   │   │   └── api.repository.ts            # Implémentation v2
│   │   ├── scoring/
│   │   │   ├── score-session.ts   # Correction automatique (hors Schreiben)
│   │   │   └── pass-probability.ts
│   │   └── validators/            # Schémas Zod (formulaires admin, payloads API)
│   │
│   ├── types/
│   │   ├── exam.ts                # Types du domaine : Exam, Section, Part, Question
│   │   ├── session.ts             # SessionState, Answer
│   │   └── question-content.ts    # Types discriminés par type de question
│   │
│   └── middleware.ts              # Protection routes (auth, rôle admin)
│
├── .env.example
├── tailwind.config.ts
└── package.json
```

### Justification des choix de structure

**Route groups `(exam)`, `(dashboard)`, `(admin)`, `(marketing)`, `(auth)`** : chaque groupe a un layout radicalement différent. Le mode examen en particulier doit être *isolé* : aucun lien vers le reste du produit, aucune distraction — c'est l'atmosphère officielle. Un candidat en session ne voit que la nav d'examen et le timer.

**`components/questions/` organisé par TYPE et non par Teil** : Lesen Teil 2, Hören Teil 1-3 et Sprachbausteine Teil 2 sont tous des QCM. Un seul composant `MultipleChoice` les sert tous. C'est l'application directe du principe « zéro duplication ». Le simulateur entier repose sur 5 types de questions :

| Type | Utilisé par |
|---|---|
| `TITLE_MATCHING` | Lesen Teil 1 |
| `MULTIPLE_CHOICE` | Lesen Teil 2, Hören Teil 1–3, Sprachbausteine Teil 2 |
| `AD_MATCHING` | Lesen Teil 3 |
| `CLOZE_DROPDOWN` | Sprachbausteine Teil 1 |
| `WRITING` | Schreiben Aufgabe A / B |

**`config/exam-structure.ts` séparé de la base** : la *structure* officielle telc est constante (elle est définie par telc gGmbH, pas par l'admin). Seul le *contenu* varie. Mettre la structure en config TypeScript typée donne l'autocomplétion, la validation à la compilation, et évite des jointures inutiles.

**`lib/repository/`** : le pattern Repository est ce qui permet « LocalStorage first, PostgreSQL later » sans réécriture. Les stores Zustand appellent l'interface, jamais l'implémentation.

---

## 3. Configuration de l'examen (source de vérité)

Extrait illustratif de `exam-structure.ts` :

```typescript
export const TELC_B2: ExamStructure = {
  level: "B2",
  schriftlichePruefung: {
    durationMinutes: 140,          // Lesen + Sprachbausteine (90) + Hören (20) + Schreiben (30)
    sections: [
      {
        id: "lesen",
        label: "Lesen",
        parts: [
          { id: "teil-1", label: "Teil 1", questionType: "TITLE_MATCHING",
            itemCount: 5, optionCount: 10, pointsPerItem: 5 },
          { id: "teil-2", label: "Teil 2", questionType: "MULTIPLE_CHOICE",
            itemCount: 5, pointsPerItem: 5 },
          { id: "teil-3", label: "Teil 3", questionType: "AD_MATCHING",
            itemCount: 10, optionCount: 12, allowNoAnswer: true, pointsPerItem: 2.5 },
        ],
      },
      // ... hoeren, sprachbausteine, schreiben
    ],
  },
};
```

La nav, le rendu, le scoring et l'admin lisent tous cet objet. Le barème exact (points par item, pondérations B1 vs B2) sera vérifié contre les documents officiels telc au moment du module Scoring.

---

## 4. Modèle de données (Prisma)

```prisma
model User {
  id            String        @id @default(cuid())
  email         String        @unique
  passwordHash  String
  name          String
  role          Role          @default(STUDENT)      // STUDENT | CENTER_ADMIN | SUPER_ADMIN
  plan          Plan          @default(FREE)          // FREE | STUDENT | CENTER | PREMIUM
  centerId      String?                               // rattachement à un centre de langue
  sessions      ExamSession[]
  createdAt     DateTime      @default(now())
}

model Exam {
  id          String    @id @default(cuid())
  title       String
  level       Level                                   // B1 | B2
  isPublished Boolean   @default(false)
  parts       ExamPart[]
  sessions    ExamSession[]
  createdAt   DateTime  @default(now())
}

model ExamPart {
  id         String     @id @default(cuid())
  examId     String
  exam       Exam       @relation(fields: [examId], references: [id])
  sectionId  String                                    // "lesen" | "hoeren" | ...
  partId     String                                    // "teil-1" | "aufgabe-a" | ...
  // Contenu partagé du Teil : texte(s) source, banque de titres, annonces A–L
  sharedContent Json
  audioUrl   String?                                   // Hören uniquement
  questions  Question[]
}

model Question {
  id          String    @id @default(cuid())
  partId      String
  part        ExamPart  @relation(fields: [partId], references: [id])
  position    Int
  type        QuestionType                             // les 5 types
  content     Json                                     // structure validée par Zod selon le type
  answerKey   Json                                     // correction (null pour WRITING)
  points      Float
}

model ExamSession {
  id           String    @id @default(cuid())
  userId       String
  examId       String
  status       SessionStatus  @default(AUDIO_CHECK)    // AUDIO_CHECK | IN_PROGRESS | SUBMITTED | EXPIRED | SCORED
  startedAt    DateTime?                               // ancre du timer — jamais modifiable
  submittedAt  DateTime?
  audioPlayed  Json      @default("[]")                // ids des audios déjà consommés
  answers      Answer[]
  result       Result?
}

model Answer {
  id         String   @id @default(cuid())
  sessionId  String
  questionId String
  value      Json                                      // string | choix | texte libre
  updatedAt  DateTime @updatedAt
  @@unique([sessionId, questionId])                    // autosave = upsert
}

model Result {
  id            String  @id @default(cuid())
  sessionId     String  @unique
  totalPoints   Float
  maxPoints     Float
  sectionScores Json                                   // détail par section/Teil
  passed        Boolean?
}
```

Points de conception :

- **`content` et `answerKey` en JSON typé par Zod** plutôt qu'une table par type de question. Cinq schémas Zod discriminés valident chaque forme. C'est le compromis pragmatique standard pour des contenus polymorphes ; la validation reste stricte côté application.
- **`Answer` avec contrainte unique (session, question)** : l'autosave devient un simple `upsert`, idempotent, sûr en cas de double envoi.
- **`startedAt` immuable** : posé une seule fois à l'entrée en session, jamais mis à jour. C'est le fondement du timer inviolable.
- **`audioPlayed` en base ET en LocalStorage** : un candidat qui refresh pendant Hören ne peut pas réécouter.

---

## 5. Gestion d'état — trois stores Zustand

**`timerStore`** : ne stocke que `startedAt` et `durationSeconds`. Le temps restant est *calculé* (`durée − (now − startedAt)`), jamais stocké. Le hook `useExamTimer` tick chaque seconde pour l'affichage et déclenche `expireSession()` à zéro (soumission automatique, comme en centre réel).

**`examSessionStore`** : réponses en mémoire (clé = questionId), position courante, statut. Chaque mutation de réponse passe par une action qui notifie `useAutosave`.

**`audioStore`** : `playedAudioIds` + booléen `navigationLocked`. Quand `navigationLocked === true`, `ExamNav` et `PartNavigation` rendent tout inerte et `LockOverlay` intercepte les clics. Le verrou se lève uniquement à l'événement `ended` de l'audio.

Persistance : les trois stores utilisent le middleware `persist` de Zustand vers LocalStorage (clé préfixée par sessionId), doublé de la synchronisation repository.

---

## 6. Mécaniques critiques

**Timer global.** Ancré sur `startedAt` serveur. Refresh, crash, fermeture : sans effet. L'expiration côté client déclenche la soumission ; côté serveur, l'API de soumission revalide `now − startedAt ≤ durée + tolérance` et marque `EXPIRED` sinon. On n'accepte jamais une copie hors délai sur la seule foi du client.

**Audio à lecture unique.** `AudioPlayer` sans barre de progression cliquable, sans pause, sans vitesse. Au `play` : l'id entre dans `playedAudioIds` (LocalStorage + base immédiatement, avant même la fin), `navigationLocked = true`. Au `ended` : déverrouillage. Un retour ultérieur sur la page affiche « Audio bereits abgespielt » et le formulaire de réponses reste accessible.

**Autosave.** Debounce 2 s après la dernière frappe/sélection → repository. Indicateur discret « Gespeichert » près du timer. Le Schreiben sauvegarde aussi sur `blur`.

**Test audio obligatoire.** Route `audio-check` : lecture d'un échantillon, réglage volume, case de confirmation « Ich höre den Ton deutlich ». Tant que `status === AUDIO_CHECK`, le middleware redirige toute tentative d'accès direct à la session vers le test.

**Navigation.** Nav sticky à deux niveaux (sections en majuscules, Teile en dessous), Teil courant surligné par un simple fond gris clair + bordure basse — pas de couleur vive. Accès direct à tout Teil non verrouillé. `Zurück` / `Weiter` en bas de zone.

---

## 7. Scoring et résultats

`score-session.ts` corrige automatiquement tout sauf le Schreiben : itération sur les `Answer`, comparaison à `answerKey`, agrégation par Teil puis section selon `config/scoring.ts`. Le Schreiben est stocké et affiché pour correction manuelle (ou, en évolution ultérieure, pré-évaluation IA — hors périmètre v1).

`pass-probability.ts` : v1 honnête — projection linéaire du score objectif rapporté au seuil telc (60 %), avec fourchette selon l'hypothèse de score Schreiben (0 %, moyen, maximum). Pas de pseudo-machine-learning.

---

## 8. Design system

Tokens dans `tailwind.config.ts` :

- Fond : `#ffffff` ; surfaces : `#fafafa` ; bordures : `#e5e5e5` (1 px partout)
- Texte : `#171717` ; secondaire : `#525252`
- Un seul accent sobre pour les états actifs/focus (bleu institutionnel `#1d4ed8`), rouge réservé au timer < 5 min
- Interdits, appliqués par convention et revue : `shadow-*`, `bg-gradient-*`, animations hors transitions de 100 ms sur les états focus/hover
- Typographie : police système (`ui-sans-serif`), tailles denses (14 px corps, 13 px navigation), interlignage serré
- Zone de lecture maximale : conteneur large, marges réduites, deux colonnes texte/questions sur desktop pour Lesen

---

## 9. Ordre de développement (modules)

| # | Module | Livrable | Dépend de |
|---|---|---|---|
| 0 | Fondations | Projet Next.js 16, Tailwind + tokens, types du domaine, `exam-structure.ts`, schéma Prisma, seed B2 | — |
| 1 | Coquille d'examen | `(exam)/layout`, ExamShell, ExamNav, GlobalTimer, timerStore, PartNavigation | 0 |
| 2 | Persistance | Repository LocalStorage, examSessionStore, useAutosave | 1 |
| 3 | Lesen | TitleMatching, MultipleChoice, AdMatching + pages Teil 1–3 | 2 |
| 4 | Sprachbausteine | ClozeDropdown + réutilisation MultipleChoice | 3 |
| 5 | Hören | AudioPlayer, audioStore, LockOverlay, useAudioOnce | 2 |
| 6 | Audio-Check | Page test casque + garde de statut | 5 |
| 7 | Schreiben | WritingTask, useWordCount, page Aufgabe A+B | 2 |
| 8 | Remise + Scoring + Results | abgabe, score-session, pages résultats | 3–7 |
| 9 | Auth + Dashboard | NextAuth, middleware, dashboard candidat | 8 |
| 10 | Admin | CRUD examens/questions, upload audio, stats, users | 9 |
| 11 | Marketing + Pricing | Landing, pricing, gating par plan | 9 |

Chaque module = un livrable autonome, testable, sans réécriture des précédents. Validation attendue entre chaque module.

---

## 10. Décisions assumées et compromis

1. **JSON + Zod pour le contenu des questions** plutôt que 5 tables : flexibilité maximale pour l'admin, validation stricte conservée côté application. Compromis : pas de requêtes SQL fines sur le contenu — acceptable, on requête toujours par Part.
2. **LocalStorage v1** : un candidat qui vide son cache perd sa session en cours. Acceptable en v1 (usage individuel), résolu en v2 par le repository API sans toucher aux composants.
3. **Correction du Schreiben manuelle en v1** : fidèle au réel (le Schreiben telc est corrigé par des examinateurs humains). L'évaluation assistée est une évolution commerciale, pas un prérequis.
4. **Anti-triche proportionné** : verrouillages UX + revalidation serveur des délais. Pas de proctoring — hors périmètre d'un simulateur d'entraînement.
