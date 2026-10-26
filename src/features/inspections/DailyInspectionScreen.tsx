import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useActor } from '@/auth';
import {
  AppText,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorView,
  FadeIn,
  FormField,
  Icon,
  PageLayout,
  ProgressBar,
  ScreenHeader,
  SectionLabel,
  SegmentedControl,
  SkeletonList,
  StatusChip,
  TextField,
  useToast,
  type SegmentOption,
} from '@/components';
import { describeInspection, describeInspectionFindings, isInspectionAbnormal } from '@/domain/describe';
import {
  FOOD_LEVELS,
  INSPECTION_SYSTEMS,
  INSPECTION_SYSTEM_LABELS,
  MENTATIONS,
  STOOL_TYPES,
  URINE_VALUES,
  type FindingValue,
  type FoodLevel,
  type InspectionInput,
  type InspectionSession,
  type InspectionSystem,
  type Mentation,
  type StoolType,
  type UrineValue,
} from '@/domain/types';
import { EXAM_TOGGLE_OPTIONS } from '@/features/arrivals/ExamFindingRow';
import { AnimalPicker } from '@/features/animals/AnimalPicker';
import { SelectedAnimalBar } from '@/features/animals/SelectedAnimalBar';
import { OfflineBanner } from '@/features/sync/OfflineBanner';
import { useGoBack } from '@/navigation/useGoBack';
import { theme } from '@/theme';
import { formatTime, sessionFor } from '@/utils/dates';

import { useInspectionBoard, useSubmitInspection } from './hooks';
import { InspectionError, createDefaultInspection, type BoardItem } from './inspectionApi';

/** Choice options; anything other than the healthy value fills with --abnormal when selected. */
const choices = <T extends string>(values: readonly T[], healthy?: T): readonly SegmentOption<T>[] =>
  values.map((value) => ({ value, label: value, tone: healthy && value !== healthy ? 'abnormal' : 'default' }));
const sessionOptions: readonly SegmentOption<InspectionSession>[] = [
  { value: 'AM', label: 'AM session', icon: 'sunny-outline' },
  { value: 'PM', label: 'PM session', icon: 'moon-outline' },
];
const mentationOptions = choices<Mentation>(MENTATIONS);
const foodOptions = choices<FoodLevel>(FOOD_LEVELS, 'Full');
const stoolOptions = choices<StoolType>(STOOL_TYPES, 'Firm');
const urineOptions = choices<UrineValue>(URINE_VALUES, 'Yes');
const findingOptions: readonly SegmentOption<FindingValue>[] = EXAM_TOGGLE_OPTIONS;

const AI_NOTE = 'Abnormal · sent for AI routing';

interface DailyInspectionScreenProps {
  /** Inspect one animal (opened from its profile). Submitting returns to the previous screen. */
  animalId?: string;
}

/** Screen 9: Daily Inspection AM/PM (FE-009). Everything defaults to Normal; next due animal after submit. */
export function DailyInspectionScreen({ animalId: focusedId }: DailyInspectionScreenProps) {
  const router = useRouter();
  const toast = useToast();
  const actor = useActor();
  const goBack = useGoBack('/daily-inspection');
  const [session, setSession] = useState<InspectionSession>(() => sessionFor());
  const board = useInspectionBoard(session);
  const submit = useSubmitInspection();
  const [pickedId, setPickedId] = useState<string | null>(focusedId ?? null);
  const [form, setForm] = useState<InspectionInput>(createDefaultInspection);
  const [pickerOpen, setPickerOpen] = useState(false);

  const items = useMemo(() => board.data?.items ?? [], [board.data]);
  // Until the user picks one: the first animal still due this session (or the first if all are done).
  const selectedId = pickedId ?? (items.find((item) => !item.record) ?? items[0])?.animal.id ?? null;
  const current = items.find((item) => item.animal.id === selectedId) ?? null;
  const nextDue = useMemo(() => nextDueAfter(items, selectedId), [items, selectedId]);
  const total = items.length;
  const left = total - (board.data?.doneCount ?? 0);
  const abnormal = isInspectionAbnormal(form);

  const selectAnimal = (id: string) => {
    setPickedId(id);
    setForm(createDefaultInspection());
    submit.reset();
  };

  const changeSession = (next: InspectionSession) => {
    setSession(next);
    setForm(createDefaultInspection());
    submit.reset();
    if (!focusedId) setPickedId(null);
  };

  const update = (patch: Partial<InspectionInput>) => setForm((value) => ({ ...value, ...patch }));
  const setSystem = (system: InspectionSystem, value: FindingValue) => update({ systems: { ...form.systems, [system]: value } });

  const handleSubmit = async () => {
    if (!current || submit.isPending) return;
    try {
      const result = await submit.mutateAsync({ animalId: current.animal.id, session, input: form, actor });
      const name = `${current.animal.kennel} ${current.animal.name}`;
      const extra = result.linkedCaseId
        ? ` Abnormal findings added to case ${result.linkedCaseId}.`
        : result.sentForReview
          ? ' Abnormal findings sent for AI review.'
          : '';
      toast.show(`${session} inspection saved for ${name}.${extra}`, 'success');
      if (focusedId) {
        goBack();
        return;
      }
      if (nextDue) selectAnimal(nextDue.animal.id);
      else setForm(createDefaultInspection());
    } catch {
      // Shown inline from submit.error.
    }
  };

  const header = (
    <ScreenHeader
      title="Daily Inspection"
      large={!focusedId}
      onBack={focusedId ? goBack : undefined}
      trailing={
        !focusedId && total > 0 ? (
          <AppText variant="bodyS" tone="muted" testID="inspection-progress" accessibilityLabel={`${left} of ${total} animals left this session`}>
            <AppText variant="label" bold>
              {String(left)}
            </AppText>
            {` of ${total} left`}
          </AppText>
        ) : null
      }
      below={
        <>
          {!focusedId && total > 0 ? <ProgressBar value={(total - left) / total} label={`${session} session progress`} /> : null}
          <SegmentedControl label="Inspection session" variant="inverse" options={sessionOptions} value={session} onChange={changeSession} testID="inspection-session" />
          {current ? (
            <SelectedAnimalBar
              testID="inspection-animal"
              animal={current.animal}
              subtitle={
                <AppText variant="bodyS" tone="muted">
                  {`${current.animal.species} · `}
                  {current.openCaseId ? (
                    <>
                      {'open case '}
                      <AppText variant="mono" bold tone="info">
                        {current.openCaseId}
                      </AppText>
                    </>
                  ) : (
                    `last check ${current.lastCheckAt ? formatTime(current.lastCheckAt) : 'none yet'}`
                  )}
                </AppText>
              }
              subtitleLabel={`${current.animal.species} · ${current.openCaseId ? `open case ${current.openCaseId}` : `last check ${current.lastCheckAt ? formatTime(current.lastCheckAt) : 'none yet'}`}`}
              onChange={focusedId ? undefined : () => setPickerOpen(true)}
              onOpenProfile={() => router.push({ pathname: '/animal/[id]', params: { id: current.animal.id } })}
            />
          ) : null}
        </>
      }
    />
  );
  const edges = focusedId ? undefined : (['top', 'left', 'right'] as const);
  const banner = focusedId ? undefined : <OfflineBanner />;

  if (board.isPending) {
    return (
      <PageLayout header={header} edges={edges} banner={banner}>
        <SkeletonList label="Loading inspections" rows={4} />
      </PageLayout>
    );
  }
  if (board.isError) {
    return (
      <PageLayout header={header} edges={edges} banner={banner}>
        <ErrorView message="Check your connection and try again." onRetry={() => void board.refetch()} />
      </PageLayout>
    );
  }
  if (!current) {
    return (
      <PageLayout header={header} edges={edges} banner={banner}>
        <EmptyState icon="paw-outline" title="No animals to inspect" message="There are no animals under active monitoring in your kennels." />
      </PageLayout>
    );
  }

  const submitError = submit.error;
  const alreadyDone = current.record;

  return (
    <PageLayout
      header={header}
      edges={edges}
      banner={banner}
      footer={
        alreadyDone ? undefined : (
          <Button
            testID="inspection-submit"
            label={focusedId || !nextDue ? `Submit ${session} inspection` : `Submit & next: ${nextDue.animal.kennel} ${nextDue.animal.name}`}
            loading={submit.isPending}
            onPress={() => void handleSubmit()}
          />
        )
      }
    >
      {alreadyDone ? (
        <FadeIn style={styles.stack}>
          <Card testID="inspection-done">
            <View style={styles.doneHeader}>
              <AppText variant="titleS" style={styles.flex}>{`${session} inspection recorded`}</AppText>
              <StatusChip label="Done" tone="success" />
            </View>
            <AppText tone="muted">{`${formatTime(alreadyDone.recordedAt)} · ${alreadyDone.recordedBy}`}</AppText>
            <AppText>{describeInspection(alreadyDone)}</AppText>
            <AppText variant="bodyS" tone="subtle">
              {`Only one ${session} inspection is recorded per animal per day.`}
            </AppText>
          </Card>
          {focusedId ? (
            <Button label="Back" variant="secondary" onPress={goBack} testID="inspection-back" />
          ) : nextDue ? (
            <Button label={`Inspect next: ${nextDue.animal.kennel} ${nextDue.animal.name}`} onPress={() => selectAnimal(nextDue.animal.id)} testID="inspection-next" />
          ) : (
            <EmptyState
              testID="inspection-all-done"
              icon="checkmark-done-outline"
              title={`All ${session} checks done`}
              message={`Every animal in your kennels has its ${session} inspection for today.`}
            />
          )}
        </FadeIn>
      ) : (
        <>
          {submitError ? (
            <Banner
              kind="error"
              title={submitError instanceof InspectionError && submitError.kind === 'already_recorded' ? 'Already recorded' : "Couldn't save the inspection"}
              message={submitError instanceof InspectionError ? submitError.message : 'Your entries are kept. Please try again.'}
              testID="inspection-error"
            />
          ) : null}
          <Banner kind="success" message="Everything defaults to Normal. Tap only what’s different." testID="inspection-hint" />

          <FormField label="Mentation">
            <SegmentedControl label="Mentation" options={mentationOptions} value={form.mentation} onChange={(mentation) => update({ mentation })} testID="inspection-mentation" />
          </FormField>

          <View style={styles.group}>
            <SectionLabel>Body systems</SectionLabel>
            <Card padded={false}>
              {INSPECTION_SYSTEMS.map((system, index) => (
                <View key={system} style={[styles.systemRow, index > 0 && styles.divider, form.systems[system] === 'abnormal' && styles.abnormalRow]}>
                  <AppText
                    variant={form.systems[system] === 'abnormal' ? 'titleS' : 'body'}
                    tone={form.systems[system] === 'abnormal' ? 'abnormal' : 'default'}
                    style={styles.systemLabel}
                  >
                    {INSPECTION_SYSTEM_LABELS[system]}
                  </AppText>
                  <View style={styles.systemToggle}>
                    <SegmentedControl
                      label={INSPECTION_SYSTEM_LABELS[system]}
                      size="sm"
                      options={findingOptions}
                      value={form.systems[system]}
                      onChange={(value) => setSystem(system, value)}
                      testID={`inspection-${system}`}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </View>

          <SectionLabel>Intake & output</SectionLabel>

          <FormField label="Food" aside={form.food !== 'Full' ? <AiNote /> : undefined}>
            <SegmentedControl label="Food" options={foodOptions} value={form.food} onChange={(food) => update({ food })} testID="inspection-food" />
          </FormField>
          <FormField label="Stool" aside={form.stool !== 'Firm' ? <AiNote /> : undefined}>
            <SegmentedControl label="Stool" options={stoolOptions} value={form.stool} onChange={(stool) => update({ stool })} testID="inspection-stool" />
          </FormField>
          <FormField label="Urine" aside={form.urine !== 'Yes' ? <AiNote /> : undefined}>
            <SegmentedControl label="Urine" options={urineOptions} value={form.urine} onChange={(urine) => update({ urine })} testID="inspection-urine" />
          </FormField>
          <TextField
            label="Other findings"
            multiline
            placeholder="Optional — anything else you noticed"
            value={form.otherFindings}
            onChangeText={(otherFindings) => update({ otherFindings })}
            testID="inspection-other"
          />
          {abnormal ? (
            <Banner
              kind="warning"
              title="Abnormal findings"
              message={`${describeInspectionFindings(form)}. They go to the open case for the same signs, or to AI routing.`}
              testID="inspection-abnormal"
            />
          ) : null}
        </>
      )}

      <AnimalPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={selectedId}
        onSelect={(animal) => selectAnimal(animal.id)}
        statusFor={(item) => {
          const boardItem = items.find((i) => i.animal.id === item.animal.id);
          return boardItem?.record ? { label: 'Done', tone: 'success' } : { label: `${session} due`, tone: 'neutral' };
        }}
      />
    </PageLayout>
  );
}

function AiNote() {
  return (
    <View style={styles.aiNote}>
      <Icon name="sparkles-outline" size="xs" color={theme.colors.abnormal} />
      <AppText variant="caption" bold tone="abnormal">
        {AI_NOTE}
      </AppText>
    </View>
  );
}

/** The next animal (in kennel order, wrapping round) whose inspection is still due. */
function nextDueAfter(items: readonly BoardItem[], currentId: string | null): BoardItem | null {
  const start = items.findIndex((item) => item.animal.id === currentId);
  for (let step = 1; step <= items.length; step += 1) {
    const item = items[(start + step) % items.length];
    if (item && !item.record && item.animal.id !== currentId) return item;
  }
  return null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: theme.spacing.s4 },
  group: { gap: theme.spacing.s3 },
  aiNote: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s1 },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.s3,
    minHeight: theme.control.minTouch + 16,
    paddingHorizontal: theme.spacing.s4,
    paddingVertical: theme.spacing.s2,
  },
  divider: { borderTopWidth: theme.control.borderWidth, borderTopColor: theme.colors.line },
  abnormalRow: { backgroundColor: theme.colors.abnormalSoft },
  // Label and toggle share one row on phones and wrap only with very large text.
  systemLabel: { flexGrow: 1, flexBasis: 90 },
  systemToggle: { flexGrow: 0, flexBasis: 216, maxWidth: '100%' },
  doneHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 },
});