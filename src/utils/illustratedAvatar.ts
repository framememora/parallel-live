import { hashString } from './avatar';

/**
 * Generated "person" look for a simulated commenter's avatar: a bust
 * silhouette (head + shoulders) in a skin tone, with a hairstyle on top,
 * layered over the same background color the letter disc would use.
 *
 * Purely a look, not an identity — there is no photo behind any commenter,
 * this just reads as a profile picture instead of a letter at a glance.
 * Deterministic per handle for the same reason as `avatarColorFor`: a
 * commenter must render identically every time they reappear in a session.
 */

export type HairStyle = 'bald' | 'short' | 'long' | 'bun';

const SKIN_TONES = ['#FFDBAC', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#5C3A21'] as const;
const HAIR_COLORS = ['#0B0B0B', '#3B2314', '#6A4423', '#A9702F', '#D9B26F', '#B7B7B7'] as const;
const HAIR_STYLES: readonly HairStyle[] = ['bald', 'short', 'long', 'bun'];

export interface IllustratedAvatarConfig {
  skinTone: string;
  hairColor: string;
  hairStyle: HairStyle;
}

/**
 * Each feature is hashed with its own salt so skin tone, hair color and
 * hairstyle vary independently — without the salts, three lookups into
 * same-length arrays from the same hash would move in lockstep.
 */
export function illustratedAvatarFor(name: string): IllustratedAvatarConfig {
  return {
    skinTone: SKIN_TONES[hashString(`${name}#skin`) % SKIN_TONES.length],
    hairColor: HAIR_COLORS[hashString(`${name}#hair`) % HAIR_COLORS.length],
    hairStyle: HAIR_STYLES[hashString(`${name}#style`) % HAIR_STYLES.length],
  };
}
