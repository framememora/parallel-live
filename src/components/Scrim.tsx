import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';

interface ScrimProps {
  /** Which edge the opaque end of the gradient sits against. */
  edge: 'top' | 'bottom';
  height: number;
  /** Opacity at the opaque end. */
  intensity?: number;
}

/**
 * A soft dark gradient anchored to one edge of the screen.
 *
 * This is what lets the overlay drop its per-element dark pills: comments and
 * counters used to each carry their own `rgba(0,0,0,0.45)` background purely so
 * white text stayed readable over a bright camera frame, which looked like
 * stacked chips rather than a broadcast overlay. One scrim behind the whole
 * region does the same job the way Instagram does it.
 */
export function Scrim({ edge, height, intensity = 0.45 }: ScrimProps) {
  const { width } = useWindowDimensions();

  // Four stops, weighted hard toward the anchored edge. The first version used
  // a near-linear ramp at 0.6 over ~350pt and read as a grey band covering half
  // the frame with a visible top edge. Holding alpha at zero through the first
  // 15% gives the fade a long toe, and 0.18x at the midpoint keeps the middle
  // of the frame effectively clear — all the darkening happens in the last
  // third, where the text actually sits.
  const stops = [0, 0.15, 0.6, 1];
  const ramp = [0, 0, intensity * 0.18, intensity];
  const alphas = edge === 'top' ? [...ramp].reverse() : ramp;
  const colorStops = alphas.map((a) => `rgba(0,0,0,${a.toFixed(3)})`);

  return (
    <View
      style={[styles.root, { height }, edge === 'top' ? { top: 0 } : { bottom: 0 }]}
      pointerEvents="none"
    >
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={colorStops} positions={stops} />
        </Rect>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
