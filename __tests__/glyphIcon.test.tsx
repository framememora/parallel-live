import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { GlyphIcon, type IconName } from '../src/components/icons/GlyphIcon';

/**
 * Skia ships ESM that jest-expo's `transformIgnorePatterns` doesn't cover, and
 * its real primitives need a native canvas. These stand-ins render as host
 * elements so the tree can be inspected; `Skia.Path` records the calls the
 * constructed paths make, which is enough to prove they were built.
 */
jest.mock('@shopify/react-native-skia', () => {
  const makePath = () => ({
    addArc: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
  });
  return {
    Canvas: 'Canvas',
    Group: 'Group',
    Path: 'Path',
    Circle: 'Circle',
    RoundedRect: 'RoundedRect',
    Line: 'Line',
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h }),
    rrect: (r: unknown, rx: number, ry: number) => ({ rect: r, rx, ry }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: { Path: { Make: makePath } },
  };
});

/**
 * Every name the union allows. Kept as a literal list rather than derived, so
 * adding to `IconName` without adding a case here is itself a visible change.
 */
const ALL_ICONS: IconName[] = [
  'heartFilled',
  'heartOutline',
  'paperPlane',
  'eye',
  'camera',
  'cameraOff',
  'cameraFlip',
  'close',
  'dots',
  'sparkle',
  'flash',
  'settings',
  'gift',
  'microphone',
];

function render(element: React.ReactElement): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
}

describe('GlyphIcon', () => {
  // `IconBody` is a switch with no default. A name in the union without a case
  // falls through and returns undefined, which renders an empty canvas — no
  // crash, no type error, just an invisible icon. This is the check for that.
  it.each(ALL_ICONS)('draws something for %s', (name) => {
    const renderer = render(<GlyphIcon name={name} />);
    const canvas = renderer.root.findByType('Canvas' as unknown as React.ComponentType);
    const drawn = canvas.findAll(
      (n) => typeof n.type === 'string' && ['Path', 'Circle', 'RoundedRect', 'Line'].includes(n.type),
      { deep: true }
    );
    expect(drawn.length).toBeGreaterThan(0);
  });

  it('gives the struck-through camera one more mark than the plain one', () => {
    const count = (name: IconName) => {
      const renderer = render(<GlyphIcon name={name} />);
      return renderer.root.findAll(
        (n) => typeof n.type === 'string' && ['Path', 'Circle', 'RoundedRect', 'Line'].includes(n.type),
        { deep: true }
      ).length;
    };

    // The two share a case; `cameraOff` is the same body plus the slash. If that
    // conditional child ever stops rendering, these collapse to equal.
    expect(count('cameraOff')).toBe(count('camera') + 1);
  });

  it('scales the artwork down by one stroke width so nothing clips the canvas', () => {
    const renderer = render(<GlyphIcon name="heartOutline" size={24} />);
    const group = renderer.root.findByType('Group' as unknown as React.ComponentType);
    const transform = group.props.transform as Array<Record<string, number>>;

    const scale = transform.find((t) => 'scale' in t)?.scale;
    // (24/24) * ((24 - 1.8) / 24)
    expect(scale).toBeCloseTo(0.925, 3);
  });

  it('honours an explicit colour', () => {
    const renderer = render(<GlyphIcon name="heartFilled" color="#FF2D55" />);
    const path = renderer.root.findByType('Path' as unknown as React.ComponentType);
    expect(path.props.color).toBe('#FF2D55');
  });
});
