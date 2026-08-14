import React, { useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { CameraRollService } from '../../../services/media/CameraRollService';
import { colors, igGradient, radii, spacing, type } from '../../../theme/tokens';

interface SaveToRollButtonProps {
  videoPath: string | undefined;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function SaveToRollButton({ videoPath }: SaveToRollButtonProps) {
  const [state, setState] = useState<SaveState>('idle');
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handlePress = async () => {
    if (!videoPath || state === 'saving' || state === 'saved') return;
    setState('saving');
    try {
      await CameraRollService.saveVideo(videoPath);
      setState('saved');
    } catch {
      setState('error');
    }
  };

  const label =
    !videoPath
      ? 'No video to save'
      : state === 'saving'
        ? 'Saving…'
        : state === 'saved'
          ? 'Saved to Camera Roll'
          : state === 'error'
            ? 'Couldn’t save — tap to retry'
            : 'Save to Camera Roll';

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const disabled = !videoPath || state === 'saving' || state === 'saved';
  // The brand gradient is reserved for the live "save this" action. The saved,
  // error and no-video states each get a flat fill so the button's state is
  // readable at a glance rather than hidden behind the same colourful pill.
  const showGradient = !!videoPath && (state === 'idle' || state === 'saving');

  return (
    <Pressable
      onPress={handlePress}
      onLayout={onLayout}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        !showGradient && styles.flatButton,
        state === 'saved' && styles.savedButton,
        state === 'error' && styles.errorButton,
        !videoPath && styles.unavailableButton,
        pressed && styles.pressed,
      ]}
    >
      {showGradient && size.width > 0 && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect x={0} y={0} width={size.width} height={size.height}>
            <LinearGradient start={vec(0, size.height)} end={vec(size.width, 0)} colors={[...igGradient]} />
          </Rect>
        </Canvas>
      )}
      <View style={styles.content} pointerEvents="none">
        {state === 'saving' && <ActivityIndicator color={colors.textPrimary} style={styles.spinner} />}
        <Text style={[styles.label, !videoPath && styles.unavailableLabel]} allowFontScaling={false}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    height: 52,
    // Clips the gradient canvas to the pill.
    overflow: 'hidden',
  },
  flatButton: {
    backgroundColor: colors.neutralAction,
  },
  savedButton: {
    backgroundColor: colors.success,
  },
  errorButton: {
    backgroundColor: colors.neutralAction,
  },
  unavailableButton: {
    backgroundColor: colors.surface,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  spinner: {
    marginRight: spacing.sm,
  },
  label: {
    ...type.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  unavailableLabel: {
    color: colors.textTertiary,
  },
});
