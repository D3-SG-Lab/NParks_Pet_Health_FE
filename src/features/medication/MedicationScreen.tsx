import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useActor } from '@/auth';
import {
  AppText,
  Banner,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorView,
  FadeIn,
  Icon,
  InfoRows,
  PageLayout,
  ScreenHeader,
  SectionLabel,
  SkeletonList,
  StatusChip,
  TextField,
  useToast,
} from '@/components';
import type { DoseSlot } from '@/domain/types';
import { AnimalPicker } from '@/features/animals/AnimalPicker';
import { SelectedAnimalBar } from '@/features/animals/SelectedAnimalBar';
import { OfflineBanner } from '@/features/sync/OfflineBanner';
import { useGoBack } from '@/navigation/useGoBack';
import { theme } from '@/theme';
import { formatTime, isoToDdMm } from '@/utils/dates';
import { useNow } from '@/utils/useNow';

import { useMedicationAnimals, useMedicationDay, useRecordAdministration } from './hooks';
import { MedicationError } from './medicationApi';

interface MedicationScreenProps {
  /** Show one animal (opened from its profile, with a back button). */
  animalId?: string;
}

/** Wireframe 10: Medication Administration (FE-013). Due and overdue doses; time and officer captured automatically. */
export function MedicationScreen({ animalId: focusedId }: MedicationScreenProps) {
  const router = useRouter();
  const goBack = useGoBack('/medication');
  const animals = useMedicationAnimals();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Pin the default (the animal needing a dose first) once known: the list re-sorts after every
  // recorded dose and the screen must not jump to another animal.
  const defaultId = animals.data?.[0]?.animal.id ?? null;
  if (!focusedId && !pickedId && defaultId) setPickedId(defaultId);
  const selectedId = focusedId ?? pickedId ?? defaultId;
  const day = useMedicationDay(selectedId);

  const header = (
    <ScreenHeader
      title="Medication"
      large={!focusedId}
      onBack={focusedId ? goBack : undefined}
      below={
        day.data ? (
          <SelectedAnimalBar
            testID="medication-animal"
            animal={day.data.animal}
            subtitle={`${day.data.scheduleCount} ${day.data.scheduleCount === 1 ? 'item' : 'items'} scheduled today`}
            onChange={focusedId ? undefined : () => setPickerOpen(true)}
            onOpenProfile={() => router.push({ pathname: '/animal/[id]', params: { id: day.data?.animal.id ?? '' } })}
          />
        ) : undefined
      }
    />
  );
  const edges = focusedId ? undefined : (['top', 'left', 'right'] as const);

  let body;
  if (animals.isPending || (selectedId && day.isPending)) {
    body = <SkeletonList label="Loading medication" rows={3} />;
  } else if (animals.isError || day.isError) {
    body = <ErrorView message="Check your connection and try again." onRetry={() => void Promise.all([animals.refetch(), day.refetch()])} />;
  } else if (!selectedId || !day.data) {
    body = (
      <EmptyState
        testID="medication-none"
        icon="medkit-outline"
        title="No medication scheduled today"
        message="When a vet adds medication or supplements to an animal's schedule, the doses due will appear here."
      />
    );
  } else {
    body = <DoseList key={selectedId} slots={day.data.slots} animalName={day.data.animal.name} />;
  }

  return (
    <PageLayout header={header} edges={edges} banner={focusedId ? undefined : <OfflineBanner />}>
      {body}
      <AnimalPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={selectedId}
        onSelect={(animal) => setPickedId(animal.id)}
        statusFor={(item) => {
          const meds = animals.data?.find((m) => m.animal.id === item.animal.id);
          if (!meds) return { label: 'No meds', tone: 'neutral' };
          if (meds.overdueCount) return { label: `${meds.overdueCount} overdue`, tone: 'danger' };
          if (meds.dueCount) return { label: `${meds.dueCount} due`, tone: 'info' };
          return { label: 'Up to date', tone: 'success' };
        }}
      />
    </PageLayout>
  );
}

/** "2x daily · 08:00 given by J. Tan at 07:52 · 16/10–25/10" (other doses of the same item today). */
function doseMeta(slot: DoseSlot, all: readonly DoseSlot[]): string {
  const others = all.filter((s) => s.scheduleId === slot.scheduleId && s.slot !== slot.slot && s.administration);
  const given = others.map((s) => `${s.time} given by ${s.administration?.by} at ${formatTime(s.administration?.administeredAt ?? 0)}`);
  const timing = slot.status === 'overdue' ? `was due ${slot.time}` : null;
  return [slot.frequency, timing, ...given, `${isoToDdMm(slot.startDate)}–${isoToDdMm(slot.endDate)}`].filter(Boolean).join(' · ');
}

function DoseList({ slots, animalName }: { slots: DoseSlot[]; animalName: string }) {
  const toast = useToast();
  const actor = useActor();
  const record = useRecordAdministration();
  const [recording, setRecording] = useState<DoseSlot | null>(null);
  const [remarks, setRemarks] = useState('');
  // Keeps the "Time · auto" in the sheet current while it is open.
  const now = useNow(15_000);

  const dueNow = slots.filter((s) => s.status === 'due' || s.status === 'overdue').sort((a, b) => (a.status === 'overdue' ? -1 : 0) - (b.status === 'overdue' ? -1 : 0));
  const later = slots.filter((s) => s.status === 'upcoming');
  const given = slots.filter((s) => s.status === 'administered').sort((a, b) => (b.administration?.administeredAt ?? 0) - (a.administration?.administeredAt ?? 0));

  const open = (slot: DoseSlot) => {
    record.reset();
    setRemarks('');
    setRecording(slot);
  };

  const confirm = async () => {
    if (!recording) return;
    try {
      await record.mutateAsync({ scheduleId: recording.scheduleId, slot: recording.slot, remarks, actor });
      toast.show(`${recording.item} ${recording.dose} recorded for ${animalName}.`, 'success');
      setRecording(null);
    } catch {
      // Shown in the sheet from record.error.
    }
  };

  const sameItem = recording ? slots.filter((s) => s.scheduleId === recording.scheduleId) : [];
  const error = record.error;

  return (
    <FadeIn style={styles.list}>
      <SectionLabel>Due & overdue</SectionLabel>
      {dueNow.length === 0 ? (
        <Card testID="medication-nothing-due" tone="success" elevated={false}>
          <View style={styles.row}>
            <Icon name="checkmark-circle" size="sm" color={theme.colors.success} />
            <AppText variant="titleS" tone="success" style={styles.flex}>
              Nothing due right now
            </AppText>
          </View>
          <AppText variant="bodyS" tone="muted">
            {later[0] ? `Next dose: ${later[0].item} at ${later[0].time}.` : 'All of today’s doses are done.'}
          </AppText>
        </Card>
      ) : (
        dueNow.map((slot) => {
          const overdue = slot.status === 'overdue';
          return (
            <Card key={slot.slot} outline={overdue ? 'danger' : 'primary'} testID={`dose-${slot.slot}`}>
              <View style={styles.row}>
                <AppText variant="titleS" style={styles.flex}>{`${slot.item} · ${slot.dose}`}</AppText>
                <StatusChip label={overdue ? 'Overdue' : `Due ${slot.time}`} tone={overdue ? 'danger' : 'info'} dot={overdue} />
              </View>
              <AppText variant="bodyS" tone="muted">
                {doseMeta(slot, slots)}
              </AppText>
              <Button label="Record dose" variant={overdue ? 'secondary' : 'primary'} size="md" onPress={() => open(slot)} testID={`dose-record-${slot.slot}`} />
            </Card>
          );
        })
      )}

      {later.length > 0 ? (
        <>
          <SectionLabel>Later today</SectionLabel>
          {later.map((slot) => (
            <Card key={slot.slot} testID={`later-${slot.slot}`}>
              <View style={styles.row}>
                <AppText variant="titleS" style={styles.flex}>{`${slot.item} · ${slot.dose}`}</AppText>
                <StatusChip label={`Due ${slot.time}`} tone="neutral" />
              </View>
              <AppText variant="bodyS" tone="muted">
                {doseMeta(slot, slots)}
              </AppText>
            </Card>
          ))}
        </>
      ) : null}

      <SectionLabel>Done today</SectionLabel>
      {given.length === 0 ? (
        <AppText tone="muted" testID="medication-none-given">
          No doses recorded yet today.
        </AppText>
      ) : (
        given.map((slot) => (
          <Card key={slot.slot} tone="muted" elevated={false} testID={`given-${slot.slot}`}>
            <View style={styles.row}>
              <Icon name="checkmark-circle" size="sm" color={theme.colors.success} />
              <View style={styles.flex}>
                <AppText variant="titleS">{`${slot.item} · ${slot.dose}`}</AppText>
                <AppText variant="bodyS" tone="muted">
                  {[
                    `Recorded ${formatTime(slot.administration?.administeredAt ?? 0)}`,
                    slot.administration?.by,
                    slot.administration?.remarks ? `“${slot.administration.remarks}”` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </View>
              <StatusChip label="Recorded" tone="success" />
            </View>
          </Card>
        ))
      )}

      <BottomSheet
        visible={recording !== null}
        title="Record administration"
        icon="pill"
        onClose={() => setRecording(null)}
        scroll
        testID="record-sheet"
        footer={
          <>
            <Button label="Cancel" variant="secondary" style={styles.flex} onPress={() => setRecording(null)} testID="record-cancel" />
            <Button label="Confirm administered" icon="checkmark" style={styles.confirm} loading={record.isPending} onPress={() => void confirm()} testID="record-confirm" />
          </>
        }
      >
        {recording ? (
          <>
            <InfoRows
              testID="record-summary"
              rows={[
                { label: 'Item', value: `${recording.item} ${recording.dose}` },
                { label: 'Dose', mono: true, value: `${recording.time} (${sameItem.findIndex((s) => s.slot === recording.slot) + 1} of ${sameItem.length})` },
                { label: 'Time', value: formatTime(now), mono: true, auto: true },
                { label: 'Officer', value: actor.name, auto: true },
              ]}
            />
            {error ? (
              <Banner
                kind="error"
                title={error instanceof MedicationError && error.kind === 'already_recorded' ? 'Already recorded' : "Couldn't record the dose"}
                message={error instanceof MedicationError ? error.message : 'Please try again.'}
                testID="medication-error"
              />
            ) : null}
            <TextField label="Remarks" multiline placeholder="Optional, e.g. mixed with food" value={remarks} onChangeText={setRemarks} testID="record-remarks" />
          </>
        ) : null}
      </BottomSheet>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: theme.spacing.s1 },
  confirm: { flex: 1.6 },
  list: { gap: theme.spacing.s3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 },
});