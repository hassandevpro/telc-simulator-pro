/**
 * Générateur pseudo-aléatoire DÉTERMINISTE (mulberry32) + helpers de tirage.
 * Une même graine (seed) reproduit exactement le même examen — indispensable
 * pour tester, régénérer et déboguer un examen à l'identique. Deux graines
 * différentes donnent deux examens différents : c'est le levier « inédit ».
 */
export interface Rng {
  /** Flottant dans [0, 1). */
  next(): number;
  /** Entier dans [min, max] inclus. */
  int(min: number, max: number): number;
  /** Un élément au hasard. */
  pick<T>(items: readonly T[]): T;
  /** `k` éléments distincts, ordre aléatoire (Fisher–Yates partiel). */
  sample<T>(items: readonly T[], k: number): T[];
  /** Copie mélangée. */
  shuffle<T>(items: readonly T[]): T[];
}

/** Convertit une graine texte en entier 32 bits (xfnv1a). */
export function seedToInt(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: string | number): Rng {
  let a = (typeof seed === "number" ? seed : seedToInt(seed)) >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min + 1));

  const shuffle = <T>(items: readonly T[]): T[] => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const sample = <T>(items: readonly T[], k: number): T[] => {
    if (k > items.length) {
      throw new Error(
        `sample: demande de ${k} éléments dans un pool de ${items.length}.`,
      );
    }
    return shuffle(items).slice(0, k);
  };

  const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)];

  return { next, int, pick, sample, shuffle };
}
