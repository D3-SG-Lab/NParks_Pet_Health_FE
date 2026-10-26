import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { queryKeys } from '@/api/queryKeys';
import { useSession } from '@/auth';
import {
  AppText,
  Banner,
  Button,
  Card,
  Icon,
  ErrorView,
  FormField,
  LoadingView,
  PageLayout,
  ScreenHeader,
  SectionLabel,
  SegmentedControl,
  SelectField,
  StepProgress,
  TextField,
  useToast,
  type SegmentOption,
  type SelectOption,
} from '@/components';
import {
  EXAM_SYSTEMS,
  EXAM_SYSTEM_LABELS,
  MENTATIONS,
  type ArrivalDetailsInput,
  type ArrivalExamInput,
  type ExamFinding,
  type ExamSystem,
  type Mentation,
} from '@/domain/types';
import { useGoBack } from '@/navigation/useGoBack';
import { theme } from '@/theme';

import { ArrivalError, createMockPhoto } from './arrivalApi';
import { ExamFindingRow } from './ExamFindingRow';
import { useArrivalDraft, useCompleteArrival, useSaveArrivalDraft, useVets } from './hooks';
import { useAutosave } from './useAutosave';
import { createEmptyExam, hasErrors, validateDetails, validateExam } from './validation';

const TOTAL_STEPS = 2;const mentationOptions: readonly SegmentOption<Mentation>[] = MENTATIONS.map((value) => ({ value, label: value }));

/** Wireframe 03: Arrival Exam, step 2 of 2. Officers only. */
export function ArrivalExamScreen() {
  const { role } = useSession();
  const draft = useArrivalDraft();
  const goBack = useGoBack('/new-arrival');

  if (role !== 'officer') return <Redirect href="/" />;
  if (draft.isPending) return <LoadingView label="Loading arrival" />;
  if (draft.isError) {
    return <ErrorView message="We couldn't load the arrival details." onRetry={() => void draft.refetch()} />;
  }

  const details = draft.data?.details;
  // Dead-end guard: the exam needs complete step 1 details. Send the user back to finish them.
  if (!details || hasErrors(validateDetails(details))) {
    return (
      <PageLayout header={<ScreenHeader title="Arrival Exam" onBack={goBack} backLabel="Go back to New Arrival" />}>
        <Card style={styles.empty} testID="exam-missing-arrival">
          <AppText bold center>
            No arrival to examine yet
          </AppText>
          <AppText tone="muted" center>
            Enter the arrival details first, then continue to the exam.
          </AppText>
          <ReturnToArrival />
        </Card>
      </PageLayout>
    );
  }
  return <ExamForm details={details} initial={draft.data?.exam ?? createEmptyExam()} />;
}

function ReturnToArrival() {
  const router = useRouter();
  return <Button label="Go to New Arrival" testID="exam-go-arrival" onPress={() => router.navigate('/new-arrival')} />;
}

interface ExamFormProps {
  details: ArrivalDetailsInput;
  initial: ArrivalExamInput;
}

function ExamForm({ details, initial }: ExamFormProps) {
  const router = useRouter();
  const toast = useToast();
  const goBack = useGoBack('/new-arrival');
  const vets = useVets();
  const saveDraft = useSaveArrivalDraft();
  const complete = useCompleteArrival();

  const [exam, setExam] = useState<ArrivalExamInput>(initial);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const completed = useRef(false);
  const client = useQueryClient();

  // Once the arrival is saved the draft no longer exists; drop it from the cache when this screen closes.
  useEffect(
    () => () => {
      if (completed.current) client.setQueryData(queryKeys.arrivalDraft, null);
    },
    [client],
  );

  const autosave = useAutosave(exam, dirty, (value) => saveDraft.mutateAsync({ exam: value }));

  const errors = useMemo(() => validateExam(exam), [exam]);
  const visible = showErrors ? errors : {};
  const errorCount = Object.keys(visible).length;

  const vetOptions: SelectOption[] = (vets.data ?? []).map((vet) => ({ value: vet.id, label: vet.name }));
  const submitError = complete.error;
  const chipConflict = submitError instanceof ArrivalError && submitError.kind === 'microchip_taken';

  const update = (patch: Partial<ArrivalExamInput>) => {
    setDirty(true);
    setExam((current) => ({ ...current, ...patch }));
  };

  const updateFinding = (system: ExamSystem, finding: ExamFinding) =>
    update({ findings: { ...exam.findings, [system]: finding } });

  const addPhoto = (system: ExamSystem) => {
    const finding = exam.findings[system];
    updateFinding(system, { ...finding, photos: [...finding.photos, createMockPhoto()] });
  };

  const handleComplete = async () => {
    setShowErrors(true);
    if (hasErrors(errors) || complete.isPending) return;
    try {
      const animal = await complete.mutateAsync({ details, exam });
      completed.current = true;
      autosave.cancel();
      toast.show(`${animal.name} is now under active monitoring in ${animal.kennel}. (Demo data)`, 'success');
      // Back to Operations, which now counts the new animal. Never back into the finished flow.
      router.navigate('/');
    } catch {
      // The error is shown inline from `complete.error`.
    }
  };

  const summaryLine = [details.kennel, details.name.trim(), details.species].filter(Boolean).join(' · ');
  const summary = (
    <AppText variant="bodyS" tone="muted" numberOfLines={1} style={styles.aside} testID="exam-animal-summary" accessibilityLabel={summaryLine}>
      <AppText variant="mono" bold>
        {details.kennel}
      </AppText>
      {['', details.name.trim(), details.species].join(' · ')}
    </AppText>
  );

  return (
    <PageLayout
      header={
        <ScreenHeader
          title="Arrival Exam"
          onBack={goBack}
          backLabel="Go back to New Arrival"
          below={<StepProgress step={2} total={TOTAL_STEPS} label={`Step 2 of ${TOTAL_STEPS} · Baseline exam`} aside={summary} />}
        />
      }
      footer={
        <>
          <View style={styles.note}>
            <Icon name="sparkles-outline" size="sm" color={theme.colors.ai} />
            <AppText variant="bodyS" tone="muted" style={styles.flex}>
              Completing starts active monitoring. Abnormal findings are sent for AI routing.
            </AppText>
          </View>
          {errorCount > 0 ? (
            <AppText variant="bodyS" tone="danger" center accessibilityLiveRegion="polite" testID="exam-error-summary">
              {`Fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} to complete the exam`}
            </AppText>
          ) : null}
          <Button label="Complete exam" testID="exam-complete" loading={complete.isPending} onPress={() => void handleComplete()} />
        </>
      }
    >
      {chipConflict ? (
        <Banner kind="error" title="Microchip already registered" message={submitError.message} testID="exam-chip-conflict" />
      ) : submitError ? (
        <Banner kind="error" title="Couldn't complete the exam" message="Your entries are kept. Please try again." testID="exam-submit-error" />
      ) : null}
      {chipConflict ? (
        <Button label="Edit arrival details" variant="secondary" testID="exam-edit-details" onPress={() => router.navigate('/new-arrival')} />
      ) : null}

      <View style={styles.pair}>
        <View style={styles.vet}>
          <SelectField
            label="Examining vet"
            required
            testID="exam-vet"
            placeholder="Select vet"
            options={vetOptions}
            value={exam.vetId}
            onChange={(vetId) => update({ vetId })}
            error={visible.vetId}
            loading={vets.isPending}
            loadError={vets.isError ? "Couldn't load vets." : undefined}
            onRetry={() => void vets.refetch()}
          />
        </View>
        <View style={styles.weight}>
          <TextField
            label="Weight"
            required
            suffix="kg"
            testID="exam-weight"
            placeholder="0.0"
            value={exam.weightKg}
            keyboardType="decimal-pad"
            inputMode="decimal"
            onChangeText={(text) => update({ weightKg: text.replace(',', '.') })}
            error={visible.weightKg}
          />
        </View>
      </View>

      <FormField label="Mentation" required>
        <SegmentedControl
          label="Mentation"
          testID="exam-mentation"
          options={mentationOptions}
          value={exam.mentation}
          onChange={(mentation) => update({ mentation })}
        />
      </FormField>

      <View style={styles.exam}>
        <SectionLabel trailing="Abnormal rows need a note">Physical exam</SectionLabel>
        <Card padded={false}>
          {EXAM_SYSTEMS.map((system, index) => (
            <ExamFindingRow
              key={system}
              divider={index > 0}
              testID={`exam-${system}`}
              label={EXAM_SYSTEM_LABELS[system]}
              finding={exam.findings[system]}
              noteError={visible[`note:${system}`]}
              onChange={(finding) => updateFinding(system, finding)}
              onAddPhoto={() => addPhoto(system)}
            />
          ))}
        </Card>
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', padding: theme.spacing.s6 },
  flex: { flex: 1 },
  aside: { flexShrink: 1, textAlign: 'right' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.s2 },
  exam: { gap: theme.spacing.s3 },
  // Vet and weight side by side; they stack only when the screen or text size leaves no room.
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s3 },
  vet: { flexGrow: 2, flexBasis: 180 },
  weight: { flexGrow: 1, flexBasis: 110 },
});
