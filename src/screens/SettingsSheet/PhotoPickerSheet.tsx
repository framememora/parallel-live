import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoLibraryService, type LibraryPhoto } from '../../services/media/PhotoLibraryService';
import { PermissionsService } from '../../services/permissions/PermissionsService';
import { useSettingsStore } from '../../state/settingsStore';
import { colors, radii, spacing, type } from '../../theme/tokens';

interface PhotoPickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

const COLUMNS = 3;
/** Horizontal padding of the sheet, matching `SettingsSheet`. */
const SHEET_PADDING = spacing.xl;
const GRID_GAP = spacing.xs;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'failed' }
  | { kind: 'ready'; photos: LibraryPhoto[]; limited: boolean };

/**
 * Picks a profile picture from the user's own gallery.
 *
 * This is a hand-built grid rather than the OS photo picker because
 * `expo-image-picker` is a native module: adding it would mean a new dev-client
 * build before anything worked at all, while `expo-media-library` is already
 * compiled into the installed app and already holds READ_MEDIA_IMAGES.
 *
 * The cost of that shortcut is real and worth naming: reading the library is a
 * broader grant than the system picker's per-photo access. It is requested
 * lazily — only when this sheet opens — so a user who never sets a photo is
 * never asked.
 */
export function PhotoPickerSheet({ visible, onClose }: PhotoPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const avatarUri = useSettingsStore((s) => s.avatarUri);
  const setAvatarUri = useSettingsStore((s) => s.setAvatarUri);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    const { granted, limited } = await PermissionsService.requestPhotoReadPermission();
    if (!granted) {
      setState({ kind: 'denied' });
      return;
    }
    try {
      const photos = await PhotoLibraryService.listRecentPhotos();
      setState({ kind: 'ready', photos, limited });
    } catch {
      // A media-store read can fail for reasons the user can act on (storage
      // unmounted) and reasons they can't. Either way an explicit retry beats
      // an empty grid that looks like "you have no photos".
      setState({ kind: 'failed' });
    }
  }, []);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const choose = (uri: string) => {
    setAvatarUri(uri);
    onClose();
  };

  const clear = () => {
    setAvatarUri(null);
    onClose();
  };

  // Derived from the real window width so the tiles stay square on any device;
  // the last column's gap is excluded, hence COLUMNS - 1.
  const tileSize = Math.floor(
    (width - SHEET_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close photo picker" />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Text style={styles.title}>Choose a photo</Text>
            {avatarUri && (
              <Pressable
                onPress={clear}
                hitSlop={spacing.sm}
                accessibilityRole="button"
                accessibilityLabel="Remove profile photo"
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.removeLabel}>Remove</Text>
              </Pressable>
            )}
          </View>

          {state.kind === 'loading' && (
            <View style={styles.message}>
              <ActivityIndicator color={colors.textPrimary} />
            </View>
          )}

          {state.kind === 'denied' && (
            <View style={styles.message}>
              <Text style={styles.messageText}>
                Photo access is off, so there&apos;s nothing to show here. Turn it on in Settings and
                reopen this sheet.
              </Text>
              <Pressable
                onPress={() => Linking.openSettings()}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
              >
                <Text style={styles.actionLabel}>Open Settings</Text>
              </Pressable>
            </View>
          )}

          {state.kind === 'failed' && (
            <View style={styles.message}>
              <Text style={styles.messageText}>Couldn&apos;t read your photos.</Text>
              <Pressable
                onPress={() => void load()}
                accessibilityRole="button"
                accessibilityLabel="Try again"
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
              >
                <Text style={styles.actionLabel}>Try again</Text>
              </Pressable>
            </View>
          )}

          {state.kind === 'ready' && (
            <>
              {state.limited && (
                <Pressable
                  onPress={async () => {
                    await PermissionsService.presentPhotoSelectionPicker();
                    void load();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Choose more photos"
                  style={({ pressed }) => [styles.limitedRow, pressed && styles.pressed]}
                >
                  <Text style={styles.limitedText}>
                    You&apos;ve only shared some photos with this app. Tap to choose more.
                  </Text>
                </Pressable>
              )}

              {state.photos.length === 0 ? (
                <View style={styles.message}>
                  <Text style={styles.messageText}>No photos found on this device.</Text>
                </View>
              ) : (
                <FlatList
                  data={state.photos}
                  keyExtractor={(item) => item.id}
                  numColumns={COLUMNS}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={styles.grid}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => choose(item.uri)}
                      accessibilityRole="button"
                      accessibilityLabel="Use this photo"
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <Image
                        source={{ uri: item.uri }}
                        style={[styles.tile, { width: tileSize, height: tileSize }]}
                        resizeMode="cover"
                        accessibilityIgnoresInvertColors
                      />
                    </Pressable>
                  )}
                />
              )}
            </>
          )}

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: SHEET_PADDING,
    paddingTop: spacing.md,
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...type.title,
    color: colors.textPrimary,
  },
  removeLabel: {
    ...type.label,
    color: colors.heart,
  },
  message: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  messageText: {
    ...type.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  actionButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  actionLabel: {
    ...type.label,
    color: colors.textPrimary,
  },
  limitedRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  limitedText: {
    ...type.small,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 17,
  },
  grid: {
    gap: GRID_GAP,
    paddingBottom: spacing.md,
  },
  gridRow: {
    gap: GRID_GAP,
  },
  tile: {
    borderRadius: radii.sm - 4,
    backgroundColor: colors.surface,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    marginTop: spacing.md,
  },
  cancelLabel: {
    ...type.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
});
