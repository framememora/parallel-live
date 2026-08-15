import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore } from '../../state/sessionStore';
import { colors, radii, spacing, type } from '../../theme/tokens';
import { StatSummaryCard } from './components/StatSummaryCard';
import { SaveToRollButton } from './components/SaveToRollButton';

export interface SessionEndScreenProps {
  onDone: () => void;
}

export function SessionEndScreen({ onDone }: SessionEndScreenProps) {
  const summary = useSessionStore((s) => s.summary);
  const reset = useSessionStore((s) => s.reset);
  const insets = useSafeAreaInsets();

  const handleDone = () => {
    reset();
    onDone();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
      {/* `hidden={false}` is explicit: the live screen hides the status bar to
          keep it out of the recording, and it has to come back here. */}
      <StatusBar style="light" hidden={false} />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>Session ended</Text>
        <Text style={styles.title}>Nice broadcast</Text>
      </View>

      {summary ? (
        <StatSummaryCard summary={summary} />
      ) : (
        <Text style={styles.noSummary}>No session data available.</Text>
      )}

      {/* Only a *failed* recording is worth warning about. With recording off —
          the default — there was never going to be a video, so reporting it as a
          failure would be a lie, and offering a save button would be a dead
          control. Both are gated on `recordingRequested` rather than on the
          absence of a path, which alone can't tell the two cases apart. */}
      {summary?.recordingRequested && !summary.finalVideoPath && (
        <View style={styles.warningBox}>
          <Text style={styles.warning}>
            We couldn’t finish processing a video for this session, so there’s nothing to save.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {summary?.recordingRequested && <SaveToRollButton videoPath={summary.finalVideoPath} />}
        <Pressable
          style={({ pressed }) => [styles.discardButton, pressed && styles.pressed]}
          onPress={handleDone}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Text style={styles.discardLabel}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    gap: spacing.xxl,
  },
  heading: {
    gap: spacing.xs,
  },
  eyebrow: {
    ...type.small,
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    ...type.display,
    color: colors.textPrimary,
  },
  noSummary: {
    ...type.body,
    fontSize: 15,
    color: colors.textSecondary,
  },
  warningBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm + 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
  },
  warning: {
    ...type.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.warning,
  },
  actions: {
    marginTop: 'auto',
    gap: spacing.xs,
  },
  discardButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  discardLabel: {
    ...type.label,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
