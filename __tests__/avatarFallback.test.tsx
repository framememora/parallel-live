import React from 'react';
import { Image, Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { Avatar } from '../src/components/Avatar';

// Skia ships ESM that jest-expo's `transformIgnorePatterns` doesn't cover, so
// importing `Avatar` pulls in a module jest can't parse. These stubs stand in
// for the gradient ring only, which none of the assertions below exercise.
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
  SweepGradient: 'SweepGradient',
  vec: (x: number, y: number) => ({ x, y }),
}));

/**
 * `ring` is left off throughout: the gradient ring is the only part of `Avatar`
 * that reaches for Skia, and none of the behaviour under test depends on it.
 */
function render(element: React.ReactElement): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
}

function update(renderer: ReactTestRenderer, element: React.ReactElement): void {
  act(() => {
    renderer.update(element);
  });
}

/** Drives the `Image`'s own `onError`, the way a URI that no longer resolves would. */
function failImage(renderer: ReactTestRenderer): void {
  const image = renderer.root.findByType(Image);
  act(() => {
    image.props.onError();
  });
}

const LIVE_URI = 'content://media/external/images/media/42';
const DEAD_URI = 'content://media/external/images/media/999';

describe('Avatar photo fallback', () => {
  it('draws the photo while the URI resolves', () => {
    const renderer = render(<Avatar name="nova" uri={LIVE_URI} />);

    expect(renderer.root.findAllByType(Image)).toHaveLength(1);
    expect(renderer.root.findAllByType(Text)).toHaveLength(0);
  });

  it('falls back to the letter disc when the photo fails to load', () => {
    // The case persistence introduced: `avatarUri` now outlives the session that
    // chose it, so the photo can be deleted or fall out of Android's "selected
    // photos" grant. Without this the disc renders empty.
    const renderer = render(<Avatar name="nova" uri={DEAD_URI} />);
    failImage(renderer);

    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    expect(renderer.root.findByType(Text).props.children).toBe('N');
  });

  it('shows a newly picked photo after a previous one failed', () => {
    // The reason the failure is tracked as the URI that failed rather than a
    // boolean: a stale flag would leave the letter disc showing forever.
    const renderer = render(<Avatar name="nova" uri={DEAD_URI} />);
    failImage(renderer);
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);

    update(renderer, <Avatar name="nova" uri={LIVE_URI} />);

    expect(renderer.root.findAllByType(Image)).toHaveLength(1);
    expect(renderer.root.findAllByType(Text)).toHaveLength(0);
  });

  it('keeps drawing the letter disc when there is no photo at all', () => {
    const renderer = render(<Avatar name="buttered_toast" uri={null} />);

    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    expect(renderer.root.findByType(Text).props.children).toBe('B');
  });
});
