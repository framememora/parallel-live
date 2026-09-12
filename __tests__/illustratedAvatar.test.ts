import { illustratedAvatarFor } from '../src/utils/illustratedAvatar';

describe('illustratedAvatarFor', () => {
  it('is deterministic: the same name always yields the same config', () => {
    const a = illustratedAvatarFor('@sunny_days');
    const b = illustratedAvatarFor('@sunny_days');
    expect(b).toEqual(a);
  });

  it('varies skin tone, hair color and hair style across different names', () => {
    const names = Array.from({ length: 30 }, (_, i) => `viewer_${i}`);
    const configs = names.map(illustratedAvatarFor);

    expect(new Set(configs.map((c) => c.skinTone)).size).toBeGreaterThan(1);
    expect(new Set(configs.map((c) => c.hairColor)).size).toBeGreaterThan(1);
    expect(new Set(configs.map((c) => c.hairStyle)).size).toBeGreaterThan(1);
  });

  it('varies the three features independently rather than in lockstep', () => {
    // If skin/hair/style were derived from the same unsalted hash, two names
    // that share a skin tone would always share a hair style too.
    const names = Array.from({ length: 40 }, (_, i) => `handle${i}`);
    const configs = names.map(illustratedAvatarFor);

    const bySkin = new Map<string, Set<string>>();
    for (const c of configs) {
      const styles = bySkin.get(c.skinTone) ?? new Set<string>();
      styles.add(c.hairStyle);
      bySkin.set(c.skinTone, styles);
    }
    const someSkinToneHasMultipleStyles = [...bySkin.values()].some((styles) => styles.size > 1);
    expect(someSkinToneHasMultipleStyles).toBe(true);
  });
});
