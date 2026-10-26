import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useActor } from '@/auth';
import {
  Pressable,
  AppText,
  Banner,
  BottomSheet,
  Button,
  FormField,
  Icon,
  InputButton,
  LinkButton,
  MediaThumb,
  PageLayout,
  ProgressBar,
  ScreenHeader,
  TextField,
  useToast,
} from '@/components';
import { animalTitle } from '@/domain/describe';
import type { Animal } from '@/domain/types';
import { AnimalAvatar } from '@/features/animals/AnimalAvatar';
import { AnimalPicker } from '@/features/animals/AnimalPicker';
import { useAnimalList, useCountryName } from '@/features/animals/hooks';
import { useGoBack } from '@/navigation/useGoBack';
import { focusRing, theme } from '@/theme';

import { useSubmitObservation } from './hooks';
import { isWorkingOffline } from './observationApi';
import { useMockUploads, type UploadItem } from './useMockUploads';

/** Photos and videos per observation. */
const MAX_MEDIA = 10;
/** Description length limit. */
const MAX_TEXT = 1000;

interface NewObservationScreenProps {
  /** Pre-selected animal (opened from its profile). */
  animalId?: string;
}

/** Screen 11: New Health Observation (FE-010, FE-011). Text alone is enough; AI matches the animal if none is picked. */
export function NewObservationScreen({ animalId: initialId }: NewObservationScreenProps) {
  const router = useRouter();
  const toast = useToast();
  const actor = useActor();
  const close = useGoBack('/');
  const animals = useAnimalList();
  const submit = useSubmitObservation();
  const uploads = useMockUploads();
  const [pickedId, setPickedId] = useState<string | null>(initialId ?? null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const picked: Animal | null = animals.data?.find((item) => item.animal.id === pickedId)?.animal ?? null;

  const handleSubmit = async () => {
    if (submit.isPending) return;
    if (!text.trim()) {
      setError('Describe what you saw. Text alone is enough to submit.');
      return;
    }
    setError(undefined);
    try {
      const observation = await submit.mutateAsync({
        animalId: pickedId,
        text,
        // Uploads still in progress carry on in the background (FE-011).
        media: uploads.items.filter((item) => item.state !== 'failed').map(({ id, kind, durationSec }) => ({ id, kind, durationSec })),
        actor,
      });
      toast.show(isWorkingOffline() ? "Saved on this device. It's sent for AI analysis when you're back online." : 'Observation saved. AI is analysing it.', 'success');
      // Replace, so Back from the result returns to where the observation was started.
      router.replace({ pathname: '/observation/[id]', params: { id: observation.id } });
    } catch {
      // Shown inline from submit.error.
    }
  };

  return (
    <PageLayout
      header={<ScreenHeader title="New Health Observation" onBack={close} backIcon="close" backLabel="Close new observation" />}
      footer={
        <>
          <AppText variant="bodyS" tone="muted" center>
            You can submit with text only. Media keeps uploading after you submit.
          </AppText>
          <Button label="Submit for AI assistance" icon="sparkles-outline" loadingLabel="Submitting" loading={submit.isPending} onPress={() => void handleSubmit()} testID="observation-submit" />
        </>
      }
    >
      {submit.isError ? (
        <Banner kind="error" title="Couldn't submit the observation" message="Your text and photos are kept. Please try again." testID="observation-error" />
      ) : null}

      <FormField label="Animal" aside="Optional — AI can match from your text">
        {picked ? <PickedAnimal animal={picked} onChange={() => setPickerOpen(true)} onClear={() => setPickedId(null)} /> : (
          <InputButton
            testID="observation-pick-animal"
            accessibilityLabel="Select animal, or let AI match it"
            icon="search"
            trailingIcon={null}
            placeholder="Select animal, or let AI match it"
            open={pickerOpen}
            onPress={() => setPickerOpen(true)}
          />
        )}
      </FormField>

      <FormField
        label="Photos & videos"
        aside={uploads.items.length > 0 ? `${uploads.items.length} of ${MAX_MEDIA}` : undefined}
        helper="Photos are compressed before upload. Uploads continue in the background."
      >
        {uploads.items.length > 0 ? (
          <View style={styles.grid}>
            {uploads.items.map((item, index) => (
              <View key={item.id} style={styles.cell}>
                <UploadTile item={item} index={index} onRetry={() => uploads.retry(item.id)} onRemove={() => uploads.remove(item.id)} />
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.captureRow}>
          <Button
            label="Camera"
            icon="camera-outline"
            variant="tonal"
            size="md"
            style={styles.flex}
            disabled={uploads.items.length >= MAX_MEDIA}
            onPress={() => setCameraOpen(true)}
            testID="observation-camera"
          />
          <Button
            label="Gallery"
            icon="image-outline"
            variant="tonal"
            size="md"
            style={styles.flex}
            disabled={uploads.items.length >= MAX_MEDIA}
            onPress={() => uploads.add('photo')}
            testID="observation-gallery"
          />
        </View>
      </FormField>

      <TextField
        label="What did you see?"
        required
        multiline
        showCount
        maxLength={MAX_TEXT}
        placeholder="e.g. KC2-2 Yang Yang — soft stool this morning, left half of breakfast"
        value={text}
        onChangeText={(next) => {
          setText(next);
          if (error && next.trim()) setError(undefined);
        }}
        helper="Mention kennel code and pet name if you skipped the animal above."
        error={error}
        testID="observation-text"
      />

      <AnimalPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} selectedId={pickedId} onSelect={(animal) => setPickedId(animal.id)} />

      <BottomSheet visible={cameraOpen} title="Camera" onClose={() => setCameraOpen(false)} testID="observation-camera-sheet">
        <AppText variant="bodyS" tone="muted">
          Demo: captures are placeholders. Nothing is uploaded or saved to the photo gallery.
        </AppText>
        <Button
          label="Take photo"
          icon="camera-outline"
          variant="secondary"
          onPress={() => {
            uploads.add('photo');
            setCameraOpen(false);
          }}
          testID="observation-take-photo"
        />
        <Button
          label="Record video"
          icon="videocam-outline"
          variant="secondary"
          onPress={() => {
            uploads.add('video');
            setCameraOpen(false);
          }}
          testID="observation-record-video"
        />
      </BottomSheet>
    </PageLayout>
  );
}

function PickedAnimal({ animal, onChange, onClear }: { animal: Animal; onChange: () => void; onClear: () => void }) {
  const country = useCountryName(animal.countryCode);
  return (
    <View style={styles.pickedRow} testID="observation-animal">
      <AnimalAvatar animal={animal} />
      <View style={styles.flex}>
        <AppText variant="titleS">
          {animalTitle(animal)}
        </AppText>
        <AppText variant="bodyS" tone="muted">{`${animal.species} · ${country}`}</AppText>
      </View>
      <LinkButton label="Change" accessibilityLabel="Change animal" onPress={onChange} />
      <Pressable accessibilityRole="button" accessibilityLabel="Clear animal, let AI match it" hitSlop={theme.spacing.s3} onPress={onClear}>
        <Icon name="close-circle-outline" size="md" color={theme.colors.text2} />
      </Pressable>
    </View>
  );
}

/** C7 upload tile: uploaded (check badge), uploading (progress), failed (Retry). */
function UploadTile({ item, index, onRetry, onRemove }: { item: UploadItem; index: number; onRetry: () => void; onRemove: () => void }) {
  const name = `${item.kind === 'video' ? 'Video' : 'Photo'} ${index + 1}`;
  if (item.state === 'failed') {
    return (
      <View style={[styles.tile, styles.failedTile]} testID={`upload-${index}`} accessible={false}>
        <View style={styles.failedLabel}>
          <Icon name="alert-circle-outline" size="xs" color={theme.colors.danger} />
          <AppText variant="caption" bold tone="danger">
            Upload failed
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name} failed to upload. Retry`}
          onPress={onRetry}
          style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [styles.retry, pressed && styles.retryPressed, focused && focusRing]}
          testID={`upload-retry-${index}`}
        >
          <Icon name="refresh" size="xs" color={theme.colors.danger} />
          <AppText variant="label" bold tone="danger">
            Retry
          </AppText>
        </Pressable>
        <RemoveButton name={name} onPress={onRemove} />
      </View>
    );
  }
  const uploaded = item.state === 'uploaded';
  const percent = Math.round(item.progress * 100);
  return (
    <View testID={`upload-${index}`}>
      <MediaThumb
        kind={item.kind}
        durationSec={uploaded ? item.durationSec : undefined}
        size="fill"
        accessibilityLabel={`${name}, ${uploaded ? 'uploaded' : `uploading ${percent}%`}`}
        overlay={
          uploaded ? (
            <View style={styles.uploadedBadge}>
              <Icon name="checkmark" size="xs" color={theme.colors.onPrimary} />
            </View>
          ) : (
            <View style={styles.progress}>
              <AppText variant="caption" bold tone={item.kind === 'video' ? 'inverse' : 'default'}>{`${item.kind === 'video' ? 'Video' : 'Photo'} · ${percent}%`}</AppText>
              <ProgressBar value={item.progress} label={`${name} uploading`} tone={item.kind === 'video' ? 'inverse' : 'primary'} />
            </View>
          )
        }
      />
      <RemoveButton name={name} onPress={onRemove} />
    </View>
  );
}

function RemoveButton({ name, onPress }: { name: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${name}`} hitSlop={theme.spacing.s3} onPress={onPress} style={styles.remove}>
      <Icon name="close-circle" size="sm" color={theme.colors.text2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  pickedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    paddingVertical: theme.spacing.s3,
    paddingLeft: theme.spacing.s3,
    paddingRight: theme.spacing.s2,
    borderRadius: theme.radius.xl,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
  },
  pressed: { backgroundColor: theme.colors.surface2 },
  // Three equal square tiles per row; they shrink with the screen width.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s2 },
  cell: { width: '31.5%', flexGrow: 0 },
  tile: { width: '100%', aspectRatio: 1, borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.s2, padding: theme.spacing.s2 },
  failedTile: { backgroundColor: theme.colors.dangerSoft, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.dangerBorder },
  failedLabel: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s1 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s1,
    minHeight: 36,
    paddingHorizontal: theme.spacing.s3,
    borderRadius: theme.radius.pill,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.surface,
  },
  retryPressed: { backgroundColor: theme.colors.dangerSoft },
  uploadedBadge: {
    position: 'absolute',
    top: theme.spacing.s2,
    right: theme.spacing.s2,
    width: 22,
    height: 22,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  progress: { position: 'absolute', left: theme.spacing.s2, right: theme.spacing.s2, bottom: theme.spacing.s2, gap: theme.spacing.s1 },
  remove: { position: 'absolute', top: -theme.spacing.s1, left: -theme.spacing.s1 },
  captureRow: { flexDirection: 'row', gap: theme.spacing.s2 },
});
