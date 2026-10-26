import { StyleSheet, View } from 'react-native';

import { AppText, Icon, MediaThumb, SegmentedControl, TextField, type SegmentOption, Pressable } from '@/components';
import type { ExamFinding } from '@/domain/types';
import { focusRing, theme } from '@/theme';

type FindingValue = 'normal' | 'abnormal';

/** C3 exam toggle: Normal by default (✓), Abnormal fills with --abnormal (!). */
export const EXAM_TOGGLE_OPTIONS: readonly SegmentOption<FindingValue>[] = [
  { value: 'normal', label: 'Normal', selectedIcon: 'checkmark' },
  { value: 'abnormal', label: 'Abnormal', tone: 'abnormal', selectedIcon: 'alert' },
];

interface ExamFindingRowProps {
  label: string;
  finding: ExamFinding;
  onChange: (next: ExamFinding) => void;
  /** Validation message for the required note. */
  noteError?: string;
  /** Adds a mock photo attachment. Real capture and upload follow FE-011 and FE-024. */
  onAddPhoto: () => void;
  /** Hairline above the row (all but the first). */
  divider?: boolean;
  testID: string;
}

/**
 * One physical-exam system inside the exam card: label left, Normal/Abnormal right. Abnormal tints the row
 * --abnormal-soft and reveals a required note and photos (screen 6).
 */
export function ExamFindingRow({ label, finding, onChange, noteError, onAddPhoto, divider = false, testID }: ExamFindingRowProps) {
  const abnormal = finding.abnormal;
  return (
    <View style={[styles.row, divider && styles.divider, abnormal && styles.abnormal]} testID={testID}>
      <View style={styles.main}>
        <AppText variant={abnormal ? 'titleS' : 'body'} tone={abnormal ? 'abnormal' : 'default'} style={styles.label}>
          {label}
        </AppText>
        <View style={styles.toggle}>
          <SegmentedControl
            label={label}
            size="sm"
            testID={`${testID}-toggle`}
            options={EXAM_TOGGLE_OPTIONS}
            value={abnormal ? 'abnormal' : 'normal'}
            onChange={(value) => onChange({ ...finding, abnormal: value === 'abnormal' })}
          />
        </View>
      </View>

      {abnormal ? (
        <View style={styles.panel}>
          <AppText variant="label" bold tone="abnormal">
            Note (required)
          </AppText>
          <TextField
            label={`${label} finding`}
            hideLabel
            testID={`${testID}-note`}
            placeholder="Describe the finding"
            multiline
            value={finding.note}
            onChangeText={(note) => onChange({ ...finding, note })}
            error={noteError}
          />
          <View style={styles.photos}>
            {finding.photos.map((photo, index) => (
              <View key={photo.id}>
                <MediaThumb kind="photo" size="md" accessibilityLabel={`Photo ${index + 1} of ${label}`} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1} from ${label}`}
                  hitSlop={theme.spacing.s3}
                  onPress={() => onChange({ ...finding, photos: finding.photos.filter((p) => p.id !== photo.id) })}
                  style={styles.remove}
                >
                  <Icon name="close-circle" size="sm" color={theme.colors.text2} />
                </Pressable>
              </View>
            ))}
            <Pressable
              testID={`${testID}-add-photo`}
              accessibilityRole="button"
              accessibilityLabel={`Add photo for ${label}`}
              onPress={onAddPhoto}
              style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [styles.addTile, pressed && styles.pressed, focused && focusRing]}
            >
              <Icon name="camera-outline" size="sm" color={theme.colors.abnormal} />
              <AppText variant="caption" tone="abnormal">
                Add
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s2, gap: theme.spacing.s3 },
  divider: { borderTopWidth: theme.control.borderWidth, borderTopColor: theme.colors.line },
  abnormal: { backgroundColor: theme.colors.abnormalSoft, paddingBottom: theme.spacing.s4 },
  // Label and toggle share a row on phones; they wrap only with very large text.
  main: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3, flexWrap: 'wrap', minHeight: theme.control.minTouch + 8 },
  label: { flexGrow: 1, flexBasis: 90 },
  toggle: { flexGrow: 0, flexBasis: 216, maxWidth: '100%' },
  panel: { gap: theme.spacing.s2 },
  photos: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.s2 },
  remove: { position: 'absolute', top: -theme.spacing.s1, right: -theme.spacing.s1 },
  addTile: {
    width: theme.control.thumb,
    height: theme.control.thumb,
    gap: 2,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.abnormal,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: theme.colors.abnormalSoft },
});
