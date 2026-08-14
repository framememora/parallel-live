import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { GlyphIcon } from '../../../components/icons/GlyphIcon';
import type { GeneratedComment } from '../../../engines/comments/types';
import { useSettingsStore } from '../../../state/settingsStore';
import { colors, radii, spacing, type } from '../../../theme/tokens';

interface CommentComposerProps {
  onSubmit: (comment: GeneratedComment) => void;
  /** Spawns hearts, same as the action rail — Instagram puts a heart here too. */
  onHeart: (x: number, y: number) => void;
  bottomInset: number;
  /** Reports the bar's real height so the screen can stack chrome above it. */
  onMeasure?: (height: number) => void;
}

const MAX_LENGTH = 120;

/**
 * Instagram's bottom comment bar. Functional on purpose: what the user types is
 * pushed into the same session store the simulated comments flow through, so it
 * appears in the feed and lands in the recording. A decorative, non-typable
 * input would be visibly dead on camera, which defeats the point.
 */
export function CommentComposer({ onSubmit, onHeart, bottomInset, onMeasure }: CommentComposerProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const keyboardOffset = useSharedValue(0);
  const handle = useSettingsStore((s) => s.handle);

  useEffect(() => {
    // iOS only. On Android the window is resized by `adjustResize`, so this
    // absolutely-positioned bar already rides up with it — translating here too
    // would double-shift it off screen.
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      keyboardOffset.value = withTiming(-e.endCoordinates.height + bottomInset, { duration: 250 });
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => {
      keyboardOffset.value = withTiming(0, { duration: 200 });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [bottomInset, keyboardOffset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardOffset.value }],
  }));

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit({
      id: `own-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      templateId: 'user-input',
      // The persona only drives the avatar tint for generated commenters; an own
      // comment is identified by `isOwn` instead.
      persona: 'supportive',
      author: handle,
      text: trimmed,
      createdAt: Date.now(),
      isOwn: true,
    });
    setText('');
    Keyboard.dismiss();
  }, [text, onSubmit, handle]);

  const canSend = text.trim().length > 0;

  return (
    <Animated.View
      style={[styles.root, { paddingBottom: bottomInset + spacing.sm }, animatedStyle]}
      pointerEvents="box-none"
      onLayout={(e) => onMeasure?.(e.nativeEvent.layout.height)}
    >
      <Pressable style={styles.field} onPress={() => inputRef.current?.focus()}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          placeholder="Comment…"
          placeholderTextColor={colors.textSecondary}
          maxLength={MAX_LENGTH}
          returnKeyType="send"
          blurOnSubmit={false}
          keyboardAppearance="dark"
          allowFontScaling={false}
          accessibilityLabel="Add a comment"
        />
        {canSend && (
          <Pressable
            onPress={submit}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel="Post comment"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlyphIcon name="paperPlane" size={20} color={colors.textPrimary} />
          </Pressable>
        )}
      </Pressable>

      <Pressable
        onPress={(evt) => onHeart(evt.nativeEvent.pageX, evt.nativeEvent.pageY)}
        hitSlop={spacing.sm}
        accessibilityRole="button"
        accessibilityLabel="Send a heart"
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      >
        <GlyphIcon name="heartFilled" size={26} color={colors.heart} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.lg,
    // Fixed height rather than vertical padding: multiline-capable inputs
    // measure differently on each platform and the bar would jump.
    height: 42,
  },
  input: {
    flex: 1,
    ...type.body,
    color: colors.textPrimary,
    padding: 0,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
