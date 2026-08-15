import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { VISION_MODELS, useSettingsStore, type VisionModelId } from '../../state/settingsStore';
import { colors, radii, spacing, type } from '../../theme/tokens';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Settings, opened by tapping the avatar in `LiveHeader` while idle. There is
 * no other entry point on purpose: the header is the only chrome that persists
 * across the idle screen, and a settings button competing with "Go Live" would
 * clutter the one screen that has to look like a broadcast.
 */
export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
  const insets = useSafeAreaInsets();

  const handle = useSettingsStore((s) => s.handle);
  const startingFollowers = useSettingsStore((s) => s.startingFollowers);
  const recordSession = useSettingsStore((s) => s.recordSession);
  const aiCommentsEnabled = useSettingsStore((s) => s.aiCommentsEnabled);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const visionModel = useSettingsStore((s) => s.visionModel);
  const setHandle = useSettingsStore((s) => s.setHandle);
  const setStartingFollowers = useSettingsStore((s) => s.setStartingFollowers);
  const setRecordSession = useSettingsStore((s) => s.setRecordSession);
  const setAiCommentsEnabled = useSettingsStore((s) => s.setAiCommentsEnabled);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setVisionModel = useSettingsStore((s) => s.setVisionModel);

  // Local copies so the fields stay editable mid-typing (the store normalizes
  // on commit — lowercasing a handle while the user is still typing it fights
  // the keyboard).
  const [handleDraft, setHandleDraft] = useState(handle);
  const [followersDraft, setFollowersDraft] = useState(String(startingFollowers));

  const commitHandle = () => setHandle(handleDraft);
  const commitFollowers = () => {
    const parsed = Number(followersDraft.replace(/[^0-9]/g, ''));
    setStartingFollowers(parsed);
    setFollowersDraft(String(Math.max(0, Math.floor(parsed) || 0)));
  };

  const close = () => {
    commitHandle();
    commitFollowers();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close settings" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          <View style={styles.grabber} />

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.identityRow}>
              <Avatar name={handleDraft || handle} size={52} ring />
              <View style={styles.identityText}>
                <Text style={styles.title}>Your profile</Text>
                <Text style={styles.subtitle}>How you appear on the broadcast</Text>
              </View>
            </View>

            <Field label="Handle">
              <TextInput
                style={styles.input}
                value={handleDraft}
                onChangeText={setHandleDraft}
                onBlur={commitHandle}
                placeholder="yourname"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                keyboardAppearance="dark"
                accessibilityLabel="Handle"
              />
            </Field>

            <Field label="Starting followers" hint="Where the follower count begins when you go live.">
              <TextInput
                style={styles.input}
                value={followersDraft}
                onChangeText={setFollowersDraft}
                onBlur={commitFollowers}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={9}
                keyboardAppearance="dark"
                accessibilityLabel="Starting followers"
              />
            </Field>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={styles.fieldLabel}>Save a video of this session</Text>
                <Text style={styles.hint}>
                  Records the screen so the saved clip shows the comments and hearts over your
                  camera. Android asks for screen-capture permission every time you go live and
                  won&apos;t let the app remember your answer — leave this off and it never asks.
                </Text>
              </View>
              <Switch
                value={recordSession}
                onValueChange={setRecordSession}
                trackColor={{ false: colors.surfaceElevated, true: colors.heart }}
                thumbColor={colors.textPrimary}
                accessibilityLabel="Save a video of this session"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={styles.fieldLabel}>Comments that react to your camera</Text>
                <Text style={styles.hint}>
                  Sends a still frame from your camera to Anthropic&apos;s API every ~20 seconds so
                  comments can mention what you&apos;re actually doing. That means pictures of you and
                  your surroundings leave your phone. Android only.
                </Text>
              </View>
              <Switch
                value={aiCommentsEnabled}
                onValueChange={setAiCommentsEnabled}
                trackColor={{ false: colors.surfaceElevated, true: colors.heart }}
                thumbColor={colors.textPrimary}
                accessibilityLabel="Enable camera-aware comments"
              />
            </View>

            {aiCommentsEnabled && (
              <Field label="Model" hint="Cost is per hour of broadcast, at one frame every 20 seconds.">
                <View style={styles.modelList}>
                  {VISION_MODELS.map((m) => (
                    <ModelOption
                      key={m.id}
                      id={m.id}
                      label={m.label}
                      blurb={m.blurb}
                      cost={m.costPerHour}
                      selected={visionModel === m.id}
                      onSelect={setVisionModel}
                    />
                  ))}
                </View>
              </Field>
            )}

            {aiCommentsEnabled && (
              <Field
                label="Anthropic API key"
                hint="Leave blank to use EXPO_PUBLIC_ANTHROPIC_API_KEY from your environment. Either way the key ends up readable inside the app bundle — use a key you can rotate, and don't ship this build to anyone else."
              >
                <TextInput
                  style={styles.input}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="sk-ant-…"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  keyboardAppearance="dark"
                  accessibilityLabel="Anthropic API key"
                />
              </Field>
            )}
          </ScrollView>

          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
          >
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/**
 * A stacked radio row rather than a segmented control: each option carries a
 * cost figure and a one-line rationale, and the whole point of exposing this is
 * that the tradeoff is legible at the moment of choosing.
 */
function ModelOption({
  id,
  label,
  blurb,
  cost,
  selected,
  onSelect,
}: {
  id: VisionModelId;
  label: string;
  blurb: string;
  cost: string;
  selected: boolean;
  onSelect: (id: VisionModelId) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelect(id)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${cost}`}
      style={({ pressed }) => [
        styles.modelOption,
        selected && styles.modelOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.modelText}>
        <View style={styles.modelHeading}>
          <Text style={styles.modelLabel} allowFontScaling={false}>
            {label}
          </Text>
          <Text style={styles.modelCost} allowFontScaling={false}>
            {cost}
          </Text>
        </View>
        <Text style={styles.hint}>{blurb}</Text>
      </View>
    </Pressable>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.card + 4,
    borderTopRightRadius: radii.card + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.xl,
  },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.lg,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...type.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  input: {
    ...type.label,
    fontWeight: '400',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radii.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.lg,
    height: 46,
  },
  hint: {
    ...type.small,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 17,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  toggleText: {
    flex: 1,
    gap: spacing.xs + 2,
  },
  modelList: {
    gap: spacing.sm,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  modelOptionSelected: {
    borderColor: colors.heart,
    borderWidth: 1,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioSelected: {
    borderColor: colors.heart,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.heart,
  },
  modelText: {
    flex: 1,
    gap: spacing.xs,
  },
  modelHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  modelLabel: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  modelCost: {
    ...type.caption,
    fontWeight: '400',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    marginTop: spacing.md,
  },
  doneLabel: {
    ...type.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
});
