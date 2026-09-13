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
import * as Updates from 'expo-updates';
import { Avatar } from '../../components/Avatar';
import { useAiStatusStore, type AiCommentStatus } from '../../state/aiStatusStore';
import { VISION_MODELS, useSettingsStore, type VisionModelId } from '../../state/settingsStore';
import { colors, radii, spacing, type } from '../../theme/tokens';
import { describeBuild } from '../../utils/buildInfo';
import { warn } from '../../utils/log';
import { PhotoPickerSheet } from './PhotoPickerSheet';

/**
 * Read once at module load. None of these can change while the JS is running —
 * applying an update means `reloadAsync()` or a cold start, and both re-evaluate
 * this module — so there is nothing to subscribe to.
 */
const BUILD = describeBuild({
  isDev: __DEV__,
  isEnabled: Updates.isEnabled,
  isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  createdAt: Updates.createdAt,
  runtimeVersion: Updates.runtimeVersion,
  channel: Updates.channel,
});

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
  const avatarUri = useSettingsStore((s) => s.avatarUri);
  const startingFollowers = useSettingsStore((s) => s.startingFollowers);
  const recordSession = useSettingsStore((s) => s.recordSession);
  const recordMicAudio = useSettingsStore((s) => s.recordMicAudio);
  const aiCommentsEnabled = useSettingsStore((s) => s.aiCommentsEnabled);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const visionModel = useSettingsStore((s) => s.visionModel);
  const aiStatus = useAiStatusStore((s) => s.status);
  // The hook behind this toggle is Android-only (vision-camera's takeSnapshot
  // throws on iOS), which the hint already said while the switch stayed live —
  // so an iOS user could turn on a feature that does nothing.
  const aiSupported = Platform.OS === 'android';
  const setHandle = useSettingsStore((s) => s.setHandle);
  const setStartingFollowers = useSettingsStore((s) => s.setStartingFollowers);
  const setRecordSession = useSettingsStore((s) => s.setRecordSession);
  const setRecordMicAudio = useSettingsStore((s) => s.setRecordMicAudio);
  const setAiCommentsEnabled = useSettingsStore((s) => s.setAiCommentsEnabled);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setVisionModel = useSettingsStore((s) => s.setVisionModel);

  // Local copies so the fields stay editable mid-typing (the store normalizes
  // on commit — lowercasing a handle while the user is still typing it fights
  // the keyboard).
  const [handleDraft, setHandleDraft] = useState(handle);
  const [followersDraft, setFollowersDraft] = useState(String(startingFollowers));
  // The key gets a draft for a different reason than the two above: settings are
  // persisted now, so every store write is a write to the encrypted store. Wired
  // straight to `onChangeText` that would be one per keystroke.
  const [apiKeyDraft, setApiKeyDraft] = useState(apiKey);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);

  const commitHandle = () => setHandle(handleDraft);
  const commitFollowers = () => {
    const parsed = Number(followersDraft.replace(/[^0-9]/g, ''));
    setStartingFollowers(parsed);
    setFollowersDraft(String(Math.max(0, Math.floor(parsed) || 0)));
  };
  const commitApiKey = () => setApiKey(apiKeyDraft);
  const statusNote = aiStatusNote(aiStatus);
  const [updateCheck, setUpdateCheck] = useState<UpdateCheckState>('idle');

  /**
   * Check, download and apply in one tap. `expo-updates` already checks on every
   * launch, but it applies what it finds on the *next* cold start — so a freshly
   * published update looks like it failed the first time the app is opened. This
   * is the way past that without force-closing the app.
   *
   * A rollback to the embedded bundle counts as something to apply too: it is
   * what a republished-then-rolled-back channel asks for.
   */
  const checkForUpdate = async () => {
    setUpdateCheck('checking');
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable && !result.isRollBackToEmbedded) {
        setUpdateCheck('current');
        return;
      }
      setUpdateCheck('downloading');
      await Updates.fetchUpdateAsync();
      // Restarts the JS, so nothing after this runs on success.
      await Updates.reloadAsync();
    } catch (error) {
      warn('updates', error);
      setUpdateCheck('failed');
    }
  };
  const updateBusy = updateCheck === 'checking' || updateCheck === 'downloading';

  const close = () => {
    commitHandle();
    commitFollowers();
    commitApiKey();
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
            <Pressable
              onPress={() => setPhotoPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              style={({ pressed }) => [styles.identityRow, pressed && styles.pressed]}
            >
              <Avatar name={handleDraft || handle} uri={avatarUri} size={52} ring />
              <View style={styles.identityText}>
                <Text style={styles.title}>Your profile</Text>
                <Text style={styles.subtitle}>How you appear on the broadcast</Text>
              </View>
              <Text style={styles.changeLabel}>{avatarUri ? 'Change' : 'Add photo'}</Text>
            </Pressable>

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

            {/* Only shown when there is a recording for it to apply to — a mic
                switch above a recording switch that is off controls nothing. */}
            {recordSession && (
              <>
                <View style={styles.divider} />

                <View style={styles.toggleRow}>
                  <View style={styles.toggleText}>
                    <Text style={styles.fieldLabel}>Record microphone audio</Text>
                    <Text style={styles.hint}>
                      Captures your voice into the saved clip. Fixed when the recording starts —
                      the microphone in the live bar is decoration and can&apos;t change it
                      mid-broadcast.
                    </Text>
                  </View>
                  <Switch
                    value={recordMicAudio}
                    onValueChange={setRecordMicAudio}
                    trackColor={{ false: colors.surfaceElevated, true: colors.heart }}
                    thumbColor={colors.textPrimary}
                    accessibilityLabel="Record microphone audio"
                  />
                </View>
              </>
            )}

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
                value={aiCommentsEnabled && aiSupported}
                onValueChange={setAiCommentsEnabled}
                disabled={!aiSupported}
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
                hint="Stored encrypted on this device and sent only to api.anthropic.com. It is never written into the app bundle — but anyone holding the phone can reach it, so use a key you can rotate and don't hand this build to anyone else."
              >
                <TextInput
                  style={styles.input}
                  value={apiKeyDraft}
                  onChangeText={setApiKeyDraft}
                  onBlur={commitApiKey}
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

            {/* The one place a failure can be reported. Nothing may be said
                during a broadcast — the feed falls back to templates and must
                not break character — so the engine leaves its reason here and
                this is where the user comes looking when the comments never
                mentioned what was in front of the camera. */}
            {aiCommentsEnabled && statusNote && (
              <View style={styles.statusNote}>
                <Text style={styles.statusText}>{statusNote}</Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Last on the sheet on purpose: nobody needs it until something
                they expected to change didn't, and then it is the first thing
                worth checking. */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>About this build</Text>
              {BUILD.kind === 'release' ? (
                <>
                  <View style={styles.buildRows}>
                    <BuildRow label="Code" value={BUILD.code} />
                    <BuildRow label="Runtime" value={BUILD.runtime} />
                    <BuildRow label="Channel" value={BUILD.channel} />
                  </View>
                  <Pressable
                    onPress={checkForUpdate}
                    disabled={updateBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Check for updates"
                    accessibilityState={{ busy: updateBusy }}
                    style={({ pressed }) => [styles.updateButton, pressed && styles.pressed]}
                  >
                    <Text
                      style={[styles.updateLabel, updateCheck === 'failed' && styles.updateLabelFailed]}
                      allowFontScaling={false}
                    >
                      {updateCheckLabel(updateCheck)}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.hint}>{BUILD.summary}</Text>
              )}
            </View>
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

        {/* Nested inside this modal rather than hoisted to the screen: it is
            only ever opened from the row above, and a Modal renders into its
            own container regardless of where it sits in the tree. */}
        <PhotoPickerSheet visible={photoPickerOpen} onClose={() => setPhotoPickerOpen(false)} />
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

/**
 * Why the last run produced nothing, in the user's terms. Each of these is a
 * state retrying cannot clear, which is why the engine stopped rather than
 * spending the rest of the session failing every twenty seconds.
 */
function aiStatusNote(status: AiCommentStatus): string | undefined {
  if (status.state !== 'stopped') return undefined;
  switch (status.reason) {
    case 'missing-key':
      return 'No comments were generated last time — there was no API key to send. Paste one above.';
    case 'auth':
      return 'No comments were generated last time — the key was rejected. Check it hasn’t been revoked.';
    case 'request':
      return 'No comments were generated last time — the selected model refused the request. Try another model.';
    case 'transient':
      return 'No comments were generated last time — the connection to the API kept failing.';
  }
}

type UpdateCheckState = 'idle' | 'checking' | 'current' | 'downloading' | 'failed';

function updateCheckLabel(state: UpdateCheckState): string {
  switch (state) {
    case 'idle':
      return 'Check for updates';
    case 'checking':
      return 'Checking…';
    case 'current':
      return 'Up to date';
    case 'downloading':
      return 'Downloading — the app will restart';
    case 'failed':
      return 'Couldn’t check — try again';
  }
}

function BuildRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.buildRow}>
      <Text style={styles.hint}>{label}</Text>
      <Text style={styles.buildValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
  changeLabel: {
    ...type.label,
    color: colors.heart,
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
  /**
   * Bordered rather than tinted: this is a report on something that already
   * happened, not an error to act on right now, and a filled warning panel in a
   * settings sheet reads as the latter.
   */
  statusNote: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
  },
  statusText: {
    ...type.small,
    fontWeight: '400',
    color: colors.warning,
    lineHeight: 17,
  },
  buildRows: {
    gap: spacing.xs,
  },
  buildRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.lg,
  },
  buildValue: {
    ...type.small,
    color: colors.textPrimary,
    // Runtime hashes are compared against `eas build:list` character by
    // character; fixed-width digits keep them from shifting as they change.
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
  updateButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  updateLabel: {
    ...type.label,
    color: colors.textPrimary,
  },
  updateLabelFailed: {
    color: colors.warning,
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
