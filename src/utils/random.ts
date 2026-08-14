/**
 * Deterministic-friendly random helpers shared by the simulation engines.
 * Every function takes an injectable `rand` source (defaults to Math.random)
 * so engines can be unit-tested with a seeded PRNG instead of real randomness.
 */

export type RandomSource = () => number;

export const defaultRandom: RandomSource = Math.random;

/** Mulberry32 seeded PRNG — small, fast, good enough for simulation (not crypto). */
export function createSeededRandom(seed: number): RandomSource {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(min: number, max: number, rand: RandomSource = defaultRandom): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function randomPick<T>(items: readonly T[], rand: RandomSource = defaultRandom): T {
  if (items.length === 0) {
    throw new Error('randomPick: items must not be empty');
  }
  return items[randomInt(0, items.length - 1, rand)];
}

export interface Weighted {
  weight: number;
}

/** Weighted random selection. `getWeight` lets callers layer extra multipliers on top of a base weight. */
export function weightedPick<T>(
  items: readonly T[],
  getWeight: (item: T) => number,
  rand: RandomSource = defaultRandom
): T {
  if (items.length === 0) {
    throw new Error('weightedPick: items must not be empty');
  }
  const weights = items.map((item) => Math.max(0, getWeight(item)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return randomPick(items, rand);
  }
  let roll = rand() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Multiplicative jitter with a log-normal-ish shape: mostly clusters near 1x,
 * occasionally spikes much higher/lower. Used so comment/heart gaps feel human
 * (bursts and lulls) instead of a metronome.
 */
export function logNormalJitter(spread: number, rand: RandomSource = defaultRandom): number {
  // Box-Muller transform -> standard normal -> exponentiate.
  const u1 = Math.max(rand(), Number.EPSILON);
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.exp(z * spread);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rolls true with the given probability (0-1). */
export function chance(probability: number, rand: RandomSource = defaultRandom): boolean {
  return rand() < probability;
}
