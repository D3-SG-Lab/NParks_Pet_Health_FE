import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Icon, SegmentedControl, TextField, type SegmentOption } from '@/components';
import type { ExamFinding } from '@/domain/types';
import { theme } from '@/theme';

type FindingValue = 'normal' | 'abnormal';

const options: readonly SegmentOption<FindingValue>[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'abnormal', label: 'Abnormal', tone: 'attention' },
];

interface ExamFindingRowProps {
  label: string;
  finding: ExamFinding;
  onChange: (next: ExamFinding) => void;
  /** Validation message for the required note. */
  noteError?: string;
  /** Adds a mock photo attachment. Real capture and upload follow FE-011 and FE-024. */
  onAddPhoto: () => void;
  testID: string;
}

/** One physical-exam system: Normal / Abnormal. Abnormal reveals a required note and photo evidence. */
export function ExamFindingRow({ label, finding, onChange, noteError, onAddPhoto, testID }: ExamFindingRowProps) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.main}>
        <AppText bold style={styles.label}>
          {label}
        </AppText>
        <View style={styles.toggle}>
          <SegmentedControl
            label={label}
            testID={`${testID}-toggle`}
            options={options}
            value={finding.abnormal ? 'abnormal' : 'normal'}
            onChange={(value) => onChange({ ...finding, abnormal: value === 'abnormal' })}
          />
        </View>
      </View>

      {finding.abnormal ? (
        <View style={styles.details}>
          <AppText variant="caption" bold style={styles.required}>
            Note required
          </AppText>
          <TextField
            label={`${label} finding`}
            testID={`${testID}-note`}
            placeholder="Describe the finding"
            multiline
            value={finding.note}
            onChangeText={(note) => onChange({ ...finding, note })}
            error={noteError}
          />
          <View style={styles.photos}>
            {finding.photos.map((photo, index) => (
              <View key={photo.id} style={styles.thumb}>
                <Icon name="image-outline" color={theme.colors.textMuted} />
                <AppText variant="caption" tone="muted">{`Photo ${index + 1}`}</AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1} from ${label}`}
                  hitSlop={theme.spacing.lg}
                  onPress={() => onChange({ ...finding, photos: finding.photos.filter((p) => p.id !== photo.id) })}
                  style={styles.remove}
                >
                  <Icon name="close-circle" size="sm" color={theme.colors.textMuted} />
                </Pressable>
              </View>
            ))}
            <Button
              label="Add photo"
              icon="camera-outline"
              variant="secondary"
              testID={`${testID}-add-photo`}
              accessibilityLabel={`Add photo for ${label}`}
              onPress={onAddPhoto}
            />
          </View>
          <AppText variant="caption" tone="muted">
            Demo only: photos are placeholders and are not uploaded or saved to the gallery.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderBottomWidth: theme.control.borderWidth,
    borderBottomColor: theme.colors.divider,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' },
  label: { flexGrow: 1, flexBasis: theme.control.thumb * 1.5 },
  toggle: { flexGrow: 1, flexBasis: theme.control.thumb * 3 },
  details: { gap: theme.spacing.md },
  required: { color: theme.colors.warning },
  photos: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md },
  thumb: {
    width: theme.control.thumb,
    height: theme.control.thumb,
    borderRadius: theme.radius.md,
    borderWidth: theme.control.borderWidth,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: { position: 'absolute', top: -theme.spacing.xs, right: -theme.spacing.xs },
});
