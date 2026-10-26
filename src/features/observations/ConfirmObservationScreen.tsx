import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useActor, useSession } from '@/auth';
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
  LinkButton,
  PageLayout,
  ScreenHeader,
  SectionLabel,
  SkeletonList,
  StatusChip,
  useToast,
  type StatusTone,
} from '@/components';
import { animalTitle, formatMicrochip, observationRef } from '@/domain/describe';
import type { Animal, ClinicalSign, Observation, RoutingAction } from '@/domain/types';
import { AnimalAvatar } from '@/features/animals/AnimalAvatar';
import { AnimalPicker } from '@/features/animals/AnimalPicker';
import { useAnimalList } from '@/features/animals/hooks';
import { EvidenceStrip } from '@/features/evidence/EvidenceStrip';
import { useGoBack } from '@/navigation/useGoBack';
import { theme } from '@/theme';
import { formatDateTime, isoToDdMm } from '@/utils/dates';

import { useCasesForAnimal, useConfirmRouting, useObservation, useSendToReviewQueue } from './hooks';
import { confidenceLabel, needsReview } from './observationApi';
import { routingChoices, RoutingChoiceList } from './RoutingChoices';
import { SignsSheet } from './SignsSheet';

const CONFIDENCE_TONE: Record<'High' | 'Medium' | 'Low', StatusTone> = { High: 'success', Medium: 'info', Low: 'warning' };
const CONFIDENCE_COLOR: Record<'High' | 'Medium' | 'Low', string> = { High: theme.colors.success, Medium: theme.colors.info, Low: theme.colors.warning };

/** Screen 12: Confirm AI routing (FE-012). Change the animal, signs or action, then Confirm & Route. */
export function ConfirmObservationScreen({ observationId }: { observationId: string }) {
  const goBack = useGoBack('/');
  const detail = useObservation(observationId);
  const header = <ScreenHeader title="Confirm AI routing" onBack={goBack} />;

  if (detail.isPending) {
    return (
      <PageLayout header={header}>
        <SkeletonList label="Loading AI result" rows={3} />
      </PageLayout>
    );
  }
  if (detail.isError) {
    return (
      <PageLayout header={header}>
        <ErrorView message="Check your connection and try again." onRetry={() => void detail.refetch()} />
      </PageLayout>
    );
  }
  const observation = detail.data?.observation;
  if (!observation) {
    return (
      <PageLayout header={header}>
        <EmptyState icon="search-outline" title="Observation not found" message="It may have been removed. Go back and try again." />
      </PageLayout>
    );
  }
  if (observation.status === 'routed' && observation.routing) return <AlreadyRouted header={header} observation={observation} />;
  if (observation.status === 'processing' || !observation.ai) return <Processing header={header} observation={observation} />;
  return <ConfirmForm key={observation.id} observation={observation} header={header} />;
}

/** "Analysing observation…" (screen 16 "AI processing"), or waiting to sync when it was saved offline. */
function Processing({ header, observation }: { header: ReactNode; observation: Observation }) {
  const goBack = useGoBack('/');
  const waitingForSync = observation.readyAt === null && !observation.aiUnavailable;
  return (
    <PageLayout header={header} footer={<Button label="Done" variant="secondary" onPress={goBack} testID="processing-done" />}>
      <Card testID="confirm-processing">
        <View style={styles.processing}>
          {waitingForSync ? <Icon name="cloud-offline-outline" color={theme.colors.text2} /> : <ActivityIndicator size="large" color={theme.colors.ai} />}
          <View style={styles.flex}>
            <AppText variant="titleS">{waitingForSync ? 'Saved on this device' : observation.aiUnavailable ? 'AI unavailable' : 'Analysing observation…'}</AppText>
            <AppText variant="bodyS" tone="muted">
              {waitingForSync
                ? "AI analysis starts once it syncs. You'll find it in the review queue or on the animal."
                : observation.aiUnavailable
                  ? 'It waits in the review queue for an officer to route it.'
                  : 'Usually under 15 s. Your observation is already saved.'}
            </AppText>
          </View>
        </View>
      </Card>
      <Card>
        <SectionLabel>Your observation</SectionLabel>
        <AppText variant="body">{`“${observation.text}”`}</AppText>
        <EvidenceStrip media={observation.media} caption={{ title: 'Observation', meta: `${formatDateTime(observation.submittedAt)} · by ${observation.submittedBy}` }} />
      </Card>
    </PageLayout>
  );
}

function AlreadyRouted({ header, observation }: { header: ReactNode; observation: Observation }) {
  const router = useRouter();
  const routing = observation.routing;
  if (!routing) return null;
  return (
    <PageLayout header={header}>
      <Card testID="observation-routed" tone="success" elevated={false}>
        <View style={styles.row}>
          <Icon name="checkmark-circle" size="sm" color={theme.colors.success} />
          <AppText variant="titleS" tone="success">
            Already routed
          </AppText>
        </View>
        <AppText tone="muted">{`Confirmed by ${routing.confirmedBy} · ${formatDateTime(routing.confirmedAt)}`}</AppText>
        <AppText>{`“${observation.text}”`}</AppText>
      </Card>
      {routing.caseId ? <Button label={`Open case ${routing.caseId}`} onPress={() => router.push({ pathname: '/case/[id]', params: { id: routing.caseId ?? '' } })} /> : null}
      <Button label="Open animal profile" variant="secondary" onPress={() => router.push({ pathname: '/animal/[id]', params: { id: routing.animalId } })} />
    </PageLayout>
  );
}

interface ConfirmFormProps {
  observation: Observation;
  header: ReactNode;
}

function ConfirmForm({ observation, header }: ConfirmFormProps) {
  const router = useRouter();
  const toast = useToast();
  const actor = useActor();
  const { role } = useSession();
  const goBack = useGoBack('/');
  const animals = useAnimalList();
  const confirm = useConfirmRouting();
  const sendToReview = useSendToReviewQueue();
  const ai = observation.ai;

  const [animalId, setAnimalId] = useState<string | null>(ai?.match?.animalId ?? null);
  const [userChangedAnimal, setUserChangedAnimal] = useState(false);
  const [signs, setSigns] = useState<ClinicalSign[]>(ai?.extraction.signs ?? []);
  const [signsEdited, setSignsEdited] = useState(false);
  const [matchConfirmed, setMatchConfirmed] = useState(false);
  const [action, setAction] = useState<RoutingAction | null>(ai?.suggestion.action ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [signsOpen, setSignsOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const cases = useCasesForAnimal(animalId);

  const animal: Animal | null = animals.data?.find((item) => item.animal.id === animalId)?.animal ?? null;
  const choices = useMemo(() => routingChoices(cases.data ?? [], signs), [cases.data, signs]);
  const chosen = choices.find((choice) => choice.action === action && !choice.disabled) ?? null;
  const confidence = ai?.match?.confidence ?? 0;
  const corrected = userChangedAnimal || signsEdited || matchConfirmed;
  // Low confidence: Confirm is disabled until the user corrects or confirms the match (wireframe UI states).
  const reviewRequired = ai ? needsReview(ai) && !corrected : false;

  if (!ai) return null;
  const label = ai.match?.selectedByUser || userChangedAnimal ? null : ai.match ? confidenceLabel(confidence) : 'Low';

  const changeAnimal = (next: Animal) => {
    setAnimalId(next.id);
    setUserChangedAnimal(true);
  };

  const handleConfirm = async () => {
    if (!animalId || !chosen || confirm.isPending || reviewRequired) return;
    try {
      const result = await confirm.mutateAsync({ observationId: observation.id, animalId, signs, action: chosen.action, caseId: chosen.caseId, actor });
      const name = animal ? `${animal.kennel} ${animal.name}` : 'the animal';
      if (result.caseId) {
        toast.show(chosen.action === 'new-case' ? `Case ${result.caseId} opened for ${name}.` : `Routed to case ${result.caseId}.`, 'success');
        router.replace({ pathname: '/case/[id]', params: { id: result.caseId } });
      } else {
        toast.show(`Added to ${name}'s 30-day timeline.`, 'success');
        router.replace({ pathname: '/animal/[id]', params: { id: result.animalId } });
      }
    } catch {
      // Shown inline from confirm.error.
    }
  };

  const handleSendToReview = async () => {
    setCorrectOpen(false);
    try {
      await sendToReview.mutateAsync(observation.id);
      toast.show('Sent to the review queue for manual triage.', 'info');
      goBack();
    } catch {
      toast.show("Couldn't send it to the review queue. Please try again.", 'error');
    }
  };

  const suggestionStillApplies = !userChangedAnimal || ai.match?.animalId === animalId;
  const suggested = choices.find((c) => c.action === ai.suggestion.action);
  const photos = observation.media.filter((m) => m.kind === 'photo').length;
  const videos = observation.media.length - photos;
  const evidenceSummary = [
    photos ? `${photos} photo${photos > 1 ? 's' : ''}` : null,
    videos ? `${videos} video${videos > 1 ? 's' : ''}` : null,
  ].filter(Boolean);

  return (
    <PageLayout
      header={header}
      footer={
        <View style={styles.footer}>
          <Button label="Correct" variant="secondary" style={styles.footerSecondary} onPress={() => setCorrectOpen(true)} testID="confirm-correct" />
          <Button
            label="Confirm & Route"
            style={styles.footerPrimary}
            disabled={!animalId || !chosen || reviewRequired}
            loading={confirm.isPending}
            onPress={() => void handleConfirm()}
            testID="confirm-route"
          />
        </View>
      }
    >
      <FadeIn style={styles.stack}>
        <View style={styles.ready} testID="confirm-ready">
          <View style={styles.aiIcon}>
            <Icon name="sparkles" size="sm" color={theme.colors.onPrimary} />
          </View>
          <View style={styles.flex}>
            <AppText variant="label" bold tone="ai">{`AI analysis ready · ${ai.durationSec} s`}</AppText>
            <AppText variant="caption" tone="muted">{`Observation ${observationRef(observation.id)}`}</AppText>
          </View>
          {label ? <StatusChip label={`${label} confidence`} tone={CONFIDENCE_TONE[label]} /> : <StatusChip label="Selected by you" tone="info" />}
        </View>

        {reviewRequired ? (
          <Banner
            kind="warning"
            title={ai.match ? `Review required · ${Math.round(confidence * 100)}% match` : 'Review required · no match'}
            message={
              ai.match
                ? 'Check the animal and signs before routing. Confirm is disabled until corrected.'
                : 'AI could not match an animal. Pick the animal, then choose the action.'
            }
            action={
              ai.match ? (
                <LinkButton label="The match is correct" icon="checkmark" onPress={() => setMatchConfirmed(true)} testID="confirm-match-correct" />
              ) : null
            }
            testID="confirm-review-required"
          />
        ) : null}
        {confirm.error ? <Banner kind="error" title="Couldn't route the observation" message={confirm.error.message} testID="confirm-error" /> : null}

        <Card testID="confirm-match">
          <View style={styles.cardHeader}>
            <SectionLabel>Matched pet record</SectionLabel>
            <LinkButton
              label={animal ? 'Change' : 'Pick animal'}
              accessibilityLabel={animal ? 'Change animal' : 'Pick animal'}
              onPress={() => setPickerOpen(true)}
              testID="confirm-change-animal"
            />
          </View>
          {animal ? (
            <View style={styles.row}>
              <AnimalAvatar animal={animal} />
              <View style={styles.flex}>
                <AppText variant="titleS">{animalTitle(animal)}</AppText>
                <AppText variant="bodyS" tone="muted">
                  {`${animal.species} · `}
                  <AppText variant="mono" tone="muted">
                    {formatMicrochip(animal.microchip)}
                  </AppText>
                </AppText>
              </View>
              <View style={[styles.ring, { borderColor: label ? CONFIDENCE_COLOR[label] : theme.colors.primary }]}>
                <AppText
                  variant="label"
                  bold
                  style={{ color: label ? CONFIDENCE_COLOR[label] : theme.colors.primary }}
                  testID="confirm-confidence"
                  accessibilityLabel={label ? `Confidence ${Math.round(confidence * 100)}%, ${label}` : 'Selected by you'}
                >
                  {label ? `${Math.round(confidence * 100)}%` : '✓'}
                </AppText>
              </View>
            </View>
          ) : (
            <View style={styles.row}>
              <View style={styles.unknown}>
                <Icon name="help" size="sm" color={theme.colors.text2} />
              </View>
              <AppText tone="muted" style={styles.flex} testID="confirm-confidence">
                No animal matched
              </AppText>
            </View>
          )}
        </Card>

        <Card testID="confirm-signs">
          <View style={styles.cardHeader}>
            <SectionLabel>Extracted signs</SectionLabel>
            <LinkButton label="Edit" icon="pencil-outline" accessibilityLabel="Edit signs" onPress={() => setSignsOpen(true)} testID="confirm-edit-signs" />
          </View>
          {signs.length === 0 && !ai.extraction.food && !ai.extraction.stool ? <AppText tone="muted">No clinical signs found.</AppText> : null}
          {signs.map((sign) => (
            <SignRow key={sign.code} label={sign.label} detail={`${sign.system} · onset ${isoToDdMm(ai.extraction.onsetDate)}`} />
          ))}
          {ai.extraction.food ? <SignRow label="Food intake" detail={`Food: ${ai.extraction.food}`} /> : null}
          {ai.extraction.stool ? <SignRow label="Stool" detail={`Stool: ${ai.extraction.stool}`} /> : null}
          <AppText variant="bodyS" tone="subtle">{`Severity cue: ${ai.extraction.severity}`}</AppText>
        </Card>

        <Card testID="confirm-evidence">
          <SectionLabel>Evidence linked</SectionLabel>
          <View style={styles.evidence}>
            <EvidenceStrip
              media={observation.media}
              maxVisible={3}
              caption={{
                title: `${signs[0]?.label ?? 'Observation'}${animal ? ` · ${animal.kennel} ${animal.name}` : ''}`,
                meta: `${formatDateTime(observation.submittedAt)} · by ${observation.submittedBy} · Observation ${observationRef(observation.id)}`,
              }}
            />
            <AppText variant="bodyS" tone="muted" style={styles.flex}>
              {evidenceSummary.length ? `${evidenceSummary.join(', ')} + your description` : 'Your description only'}
            </AppText>
          </View>
        </Card>

        <Card outline="primary" testID="confirm-routing-card">
          <SectionLabel>Routing suggestion</SectionLabel>
          {suggestionStillApplies && suggested && !suggested.disabled ? (
            <>
              <AppText variant="titleS">
                {suggested.action === 'update-case' ? `Add to 30-day timeline and update case ${suggested.caseId}` : suggested.label}
              </AppText>
              <AppText variant="bodyS" tone="muted">
                <AppText variant="bodyS" bold>
                  Why:
                </AppText>
                {` ${ai.suggestion.rationale}`}
              </AppText>
            </>
          ) : (
            <AppText variant="bodyS" tone="muted">
              {animalId ? 'Choose how to route it for the selected animal.' : 'Pick the animal to see its open and closed cases.'}
            </AppText>
          )}
          {animalId && cases.isPending ? (
            <SkeletonList label="Loading cases" rows={1} />
          ) : (
            <RoutingChoiceList
              testID="confirm-routing"
              choices={choices}
              value={chosen?.action ?? null}
              aiPick={suggestionStillApplies ? ai.suggestion.action : null}
              onChange={(choice) => setAction(choice.action)} />
          )}
        </Card>
      </FadeIn>

      <AnimalPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} selectedId={animalId} onSelect={changeAnimal} />
      <SignsSheet
        visible={signsOpen}
        value={signs}
        onClose={() => setSignsOpen(false)}
        onSave={(next) => {
          setSigns(next);
          setSignsEdited(true);
        }}
      />
      <BottomSheet visible={correctOpen} title="Correct the AI result" onClose={() => setCorrectOpen(false)} testID="confirm-correct-sheet">
        <Button
          label="Change animal"
          icon="paw-outline"
          variant="secondary"
          onPress={() => {
            setCorrectOpen(false);
            setPickerOpen(true);
          }}
        />
        <Button
          label="Edit signs"
          icon="list-outline"
          variant="secondary"
          onPress={() => {
            setCorrectOpen(false);
            setSignsOpen(true);
          }}
        />
        {role === 'officer' || observation.status !== 'review' ? (
          <Button
            label={observation.status === 'review' ? 'Leave in the review queue' : 'Send to the review queue'}
            icon="file-tray-full-outline"
            variant="secondary"
            loading={sendToReview.isPending}
            onPress={() => void handleSendToReview()}
            testID="confirm-send-review"
          />
        ) : null}
      </BottomSheet>
    </PageLayout>
  );
}

function SignRow({ label, detail }: { label: string; detail: string }) {
  return (
    <View style={styles.signRow} accessible accessibilityLabel={`${label}, ${detail}`}>
      <AppText variant="titleS" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="bodyS" tone="muted">
        {detail}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 2 },
  stack: { gap: theme.spacing.s3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 },
  processing: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 },
  ready: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    flexWrap: 'wrap',
    padding: theme.spacing.s3,
    borderRadius: theme.radius.xl,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.aiBorder,
    backgroundColor: theme.colors.aiSoft,
  },
  aiIcon: {
    width: theme.control.iconBadge,
    height: theme.control.iconBadge,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.ai,
  },
  ring: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.s3, minHeight: 28 },
  unknown: {
    width: theme.control.avatar,
    height: theme.control.avatar,
    borderRadius: theme.radius.pill,
    borderWidth: theme.control.borderWidth,
    borderStyle: 'dashed',
    borderColor: theme.colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s3,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface2,
  },
  evidence: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3, flexWrap: 'wrap' },
  footer: { flexDirection: 'row', gap: theme.spacing.s3 },
  footerSecondary: { flex: 1 },
  footerPrimary: { flex: 1.8 },
});