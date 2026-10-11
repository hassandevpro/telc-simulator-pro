/**
 * Projection candidat du contenu (lib/candidate-content.ts) : liste blanche.
 *
 * Le contenu stocké est un JSON libre. Chaque champ « sensible » porte une
 * valeur SENTINELLE : une simple recherche de sous-chaîne dans le JSON
 * sérialisé prouve qu'il n'a pas traversé la projection.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { toCandidateBundle, toCandidatePart } from "@/lib/candidate-content";
import type { ExamContentBundle, PartContent } from "@/types/question-content";

const SECRETS = [
  "TRANSCRIPT_SECRET",
  "AUDIO_LOCATION_SECRET",
  "ANSWERKEY_SECRET",
  "HINT_SECRET",
  "NESTED_SECRET",
] as const;

/** Un Teil dont chaque niveau porte des champs qui ne doivent jamais sortir. */
function pollutedPart(type: PartContent["type"]): PartContent {
  const sharedByType: Record<PartContent["type"], Record<string, unknown>> = {
    TITLE_MATCHING: { titles: [{ id: "t1", text: "Titel", hint: "HINT_SECRET" }] },
    MULTIPLE_CHOICE: { sourceText: "Quelltext" },
    AD_MATCHING: { ads: [{ key: "A", text: "Anzeige", answer: "ANSWERKEY_SECRET" }] },
    CLOZE_DROPDOWN: {
      text: "Text {{1}}",
      wordBank: [{ id: "a", text: "wort", note: "HINT_SECRET" }],
    },
    WRITING: {},
  };
  const contentByType: Record<PartContent["type"], Record<string, unknown>> = {
    TITLE_MATCHING: { text: "Text 1" },
    MULTIPLE_CHOICE: {
      question: "Frage?",
      options: [{ id: "a", text: "A", correct: "ANSWERKEY_SECRET" }],
    },
    AD_MATCHING: { situation: "Situation" },
    CLOZE_DROPDOWN: { gapIndex: 1, options: [{ id: "a", text: "A", ok: "NESTED_SECRET" }] },
    WRITING: { prompt: "Schreiben Sie", bulletPoints: ["Punkt 1", "Punkt 2"], minWords: 80 },
  };
  return {
    type,
    shared: {
      instructions: "Lesen Sie.",
      ...sharedByType[type],
      script: { text: "TRANSCRIPT_SECRET Die Antwort ist B.", speakers: ["A", "B"] },
      audioUrl: "https://projet.supabase.co/storage/v1/object/public/audio/AUDIO_LOCATION_SECRET.mp3",
      audioPath: "AUDIO_LOCATION_SECRET.mp3",
      answerKey: "ANSWERKEY_SECRET",
      extra: { deep: "NESTED_SECRET" },
    },
    questions: [
      {
        id: "q1",
        position: 1,
        points: 5,
        content: { ...contentByType[type], answerKey: "ANSWERKEY_SECRET", script: "TRANSCRIPT_SECRET" },
        answerKey: "ANSWERKEY_SECRET",
      },
    ],
  } as unknown as PartContent;
}

const TYPES: PartContent["type"][] = [
  "TITLE_MATCHING",
  "MULTIPLE_CHOICE",
  "AD_MATCHING",
  "CLOZE_DROPDOWN",
  "WRITING",
];

for (const type of TYPES) {
  test(`${type} : transcription, emplacement audio, corrigé et champs inconnus ne sortent pas`, () => {
    const out = JSON.stringify(toCandidatePart(pollutedPart(type), true));
    for (const secret of SECRETS) {
      assert.ok(!out.includes(secret), `${secret} a traversé la projection (${type})`);
    }
    assert.ok(!/"script"|"audioUrl"|"audioPath"|"answerKey"|"hint"|"extra"/.test(out));
  });
}

test("les champs affichables sont CONSERVÉS (le rendu ne perd rien)", () => {
  const mc = toCandidatePart(pollutedPart("MULTIPLE_CHOICE"), false);
  assert.deepEqual(mc.shared, { instructions: "Lesen Sie.", sourceText: "Quelltext" });
  assert.deepEqual(mc.questions[0], {
    id: "q1",
    position: 1,
    points: 5,
    content: { question: "Frage?", options: [{ id: "a", text: "A" }] },
  });

  const writing = toCandidatePart(pollutedPart("WRITING"), false);
  assert.deepEqual(writing.questions[0].content, {
    prompt: "Schreiben Sie",
    minWords: 80,
    bulletPoints: ["Punkt 1", "Punkt 2"],
  });

  const cloze = toCandidatePart(pollutedPart("CLOZE_DROPDOWN"), false);
  assert.deepEqual(cloze.shared, {
    instructions: "Lesen Sie.",
    text: "Text {{1}}",
    wordBank: [{ id: "a", text: "wort" }],
  });

  const ads = toCandidatePart(pollutedPart("AD_MATCHING"), false);
  assert.deepEqual((ads.shared as { ads: unknown }).ads, [{ key: "A", text: "Anzeige" }]);
  const titles = toCandidatePart(pollutedPart("TITLE_MATCHING"), false);
  assert.deepEqual((titles.shared as { titles: unknown }).titles, [{ id: "t1", text: "Titel" }]);
});

test("hasAudio : seul indicateur audio transmis, uniquement si un audio est rattaché", () => {
  assert.equal((toCandidatePart(pollutedPart("MULTIPLE_CHOICE"), true).shared as { hasAudio?: boolean }).hasAudio, true);
  assert.ok(!("hasAudio" in toCandidatePart(pollutedPart("MULTIPLE_CHOICE"), false).shared));
});

test("contenu mal formé (listes absentes, types inattendus) : pas d'exception, pas de fuite", () => {
  const broken = {
    type: "MULTIPLE_CHOICE",
    shared: null,
    questions: [{ id: "q", position: 1, points: 1, content: "TRANSCRIPT_SECRET" }],
  } as unknown as PartContent;
  const out = JSON.stringify(toCandidatePart(broken, false));
  assert.ok(!out.includes("TRANSCRIPT_SECRET"));
});

test("bundle : chaque Teil est projeté, l'ensemble ne contient aucun secret", () => {
  const bundle: ExamContentBundle = {
    examId: "e",
    title: "T",
    level: "B2",
    parts: Object.fromEntries(TYPES.map((type) => [`s/${type}`, pollutedPart(type)])),
  };
  const out = JSON.stringify(toCandidateBundle(bundle, new Set(["s/MULTIPLE_CHOICE"])));
  for (const secret of SECRETS) assert.ok(!out.includes(secret));
  assert.equal(out.match(/"hasAudio":true/g)?.length, 1);
});
