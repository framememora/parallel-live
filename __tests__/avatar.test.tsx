import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { Image, Text } from 'react-native';
import { Avatar } from '../src/components/Avatar';

// Same stand-ins as glyphIcon.test.tsx: Skia ships ESM that jest-expo doesn't
// transform, and its real primitives need a native canvas.
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
  SweepGradient: 'SweepGradient',
  vec: (x: number, y: number) => ({ x, y }),
}));

function render(element: React.ReactElement): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
}

const faces = (r: ReactTestRenderer) => r.root.findAllByProps({ testID: 'illustrated-face' });
const images = (r: ReactTestRenderer) => r.root.findAllByType(Image);

describe('Avatar', () => {
  it('draws a letter disc by default, with no face and no photo', () => {
    const renderer = render(<Avatar name="newbie_42" />);

    expect(renderer.root.findAllByType(Text)).toHaveLength(1);
    expect(faces(renderer)).toHaveLength(0);
    expect(images(renderer)).toHaveLength(0);
  });

  it('gives a simulated commenter a derived portrait over the drawn face', () => {
    const renderer = render(<Avatar name="newbie_42" simulated />);

    // Both are present: the face is what shows until the portrait loads, and
    // what remains if it never does.
    expect(faces(renderer).length).toBeGreaterThan(0);
    expect(images(renderer)[0].props.source.uri).toMatch(/^https:\/\/randomuser\.me\//);
    expect(renderer.root.findAllByType(Text)).toHaveLength(0);
  });

  it('falls back to the drawn face when the portrait fails to load', () => {
    const renderer = render(<Avatar name="newbie_42" simulated />);

    act(() => {
      images(renderer)[0].props.onError();
    });

    expect(images(renderer)).toHaveLength(0);
    expect(faces(renderer).length).toBeGreaterThan(0);
  });

  it('renders the same name identically across instances (deterministic look)', () => {
    const a = render(<Avatar name="og_fan" simulated />);
    const b = render(<Avatar name="og_fan" simulated />);

    // Serialized rather than `toEqual`, which compares the two `onError`
    // closures by identity and fails on trees that are otherwise identical.
    // `JSON.stringify` drops function props and keeps everything that renders.
    expect(JSON.stringify(a.toJSON())).toBe(JSON.stringify(b.toJSON()));
  });

  it("prefers the broadcaster's own photo over a derived portrait", () => {
    const renderer = render(<Avatar name="newbie_42" simulated uri="file:///photo.jpg" />);

    expect(images(renderer)).toHaveLength(1);
    expect(images(renderer)[0].props.source.uri).toBe('file:///photo.jpg');
  });

  it('falls back to the letter disc when the broadcaster photo fails', () => {
    const renderer = render(<Avatar name="newbie_42" uri="file:///gone.jpg" />);

    act(() => {
      images(renderer)[0].props.onError();
    });

    expect(images(renderer)).toHaveLength(0);
    expect(renderer.root.findAllByType(Text)).toHaveLength(1);
  });
});
