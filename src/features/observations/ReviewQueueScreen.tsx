import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useActor, useSession } from '@/auth';
import {
  Pressable,
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorView,
  FadeIn,
  FormField,
  Icon,
  InputButton,
  KennelCode,
  LinkButton,
  PageLayout,
  RadioOption,
  ScreenHeader,
  SkeletonList,
  StatusChip,
  useToast,
} from '@/components';
import { animalTitle, observationRef } from '@/domain/describe';
import type { Animal, RoutingAction } from '@/domain/types';
import { AnimalAvatar } from '@/features/animals/AnimalAvatar';
import { AnimalPicker } from '@/features/animals/AnimalPicker';
import { EvidenceStrip } from '@/features/evidence/EvidenceStrip';
import { useGoBack } from '@/navigation/useGoBack';
import { theme } from '@/theme';
import { relativeTime } from '@/utils/dates';

import { useCasesForAnimal, useConfirmRouting, useReviewQueue } from './hooks';
import type { ReviewQueueItem } from './observationApi';
import { routingChoices } from './RoutingChoices';

const ACTION_SHORT: Record<RoutingAction, string> = {
  'timeline-only': 'Timeline only',
  'new-case': 'New case',
  'update-case': 'Update open case',
  'reopen-case': 'Reopen case',
};
/** Grid order from the wireframe (2 × 2). */
const GRID: readonly RoutingAction[] = ['timeline-only', 'new-case', 'update-case', 'reopen-case'];

/** Screen 4: Review queue (FE-017). Officers triage unmatched, low-confidence and AI-unavailable observations. */
export function ReviewQueueScreen() {
  const { role } = useSession();
  const goBack = useGoBack('/');
  const queue = useReviewQueue();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (role !== 'officer') return <Redirect href="/" />;
  const items = queue.data ?? [];
  const count = items.length;
  // The first item is open by default; tapping another opens it instead.
  const openId = expandedId && items.some((i) => i.observation.id === expandedId) ? expandedId : (items[0]?.observation.id ?? null);

  return (
    <PageLayout
      header={
        <ScreenHeader
          title="Review queue"
          onBack={goBack}
          trailing={queue.data ? <StatusChip label={`${count} to triage`} tone="warning" dot={false} testID="review-count" /> : null}
        />
      }
    >
      <AppText variant="bodyS" tone="muted">
        Observations the AI could not match to an animal, or scored below the confidence threshold. Pick the animal and case action manually.
      </AppText>
      {queue.isPending ? (
        <SkeletonList label="Loading the review queue" rows={3} />
      ) : queue.isError ? (
        <ErrorView message="Check your connection and try again." onRetry={() => void queue.refetch()} />
      ) : count === 0 ? (
        <EmptyState testID="review-empty" icon="checkmark-done-outline" title="Nothing to triage" message="Every observation has been matched and routed." />
      ) : (
        items.map((item, index) => (
          <FadeIn key={item.observation.id} delay={index * 50}>
            <QueueCard item={item} expanded={item.observation.id === openId} onExpand={() => setExpandedId(item.observation.id)} />
          </FadeIn>
        ))
      )}
    </PageLayout>
  );
}

interface QueueCardProps {
  item: ReviewQueueItem;
  expanded: boolean;
  onExpand: () => void;
}

function QueueCard({ item, expanded, onExpand }: QueueCardProps) {
  const router = useRouter();
  const toast = useToast();
  const actor = useActor();
  const confirm = useConfirmRouting();
  const { observation, reason, guess, guessCase, candidates } = item;
  const ai = observation.ai;
  const id = observation.id;
  // Low-confidence items start from the AI's guess; unmatched ones start empty.
  const [picked, setPicked] = useState<Animal | null>(reason === 'low-confidence' ? guess : null);
  const [action, setAction] = useState<RoutingAction | null>(ai?.suggestion.action ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const cases = useCasesForAnimal(picked?.id ?? null);
  const signs = useMemo(() => ai?.extraction.signs ?? [], [ai]);
  const choices = useMemo(() => routingChoices(cases.data ?? [], signs), [cases.data, signs]);
  const chosen = choices.find((c) => c.action === action && !c.disabled) ?? null;

  const chip =
    reason === 'no-match'
      ? 'No animal match'
      : reason === 'low-confidence'
        ? `Low confidence · ${Math.round((ai?.match?.confidence ?? 0) * 100)}%`
        : 'AI unavailable';
  const who = `${relativeTime(observation.submittedAt)} · ${observation.submittedBy}${observation.submittedByRole === 'contractor' ? ' (contractor)' : ''}`;
  const summary =
    reason === 'low-confidence' && guess
      ? `Suggested: ${guess.kennel} ${guess.name} · ${ai?.suggestion.action === 'update-case' && guessCase ? `update case ${guessCase.id}` : ACTION_SHORT[ai?.suggestion.action ?? 'timeline-only']}`
      : reason === 'ai-unavailable'
        ? 'Needs manual routing'
        : candidates.length
          ? `AI candidates: ${candidates.map((c) => `${c.animal.kennel} ${c.animal.name} (${Math.round(c.confidence * 100)}%)`).join(' · ')}`
          : 'AI guess: none';

  const triage = async () => {
    if (!picked || !chosen) return;
    try {
      const result = await confirm.mutateAsync({ observationId: id, animalId: picked.id, signs, action: chosen.action, caseId: chosen.caseId, actor });
      toast.show(
        result.caseId ? `Triaged to ${picked.kennel} ${picked.name} · case ${result.caseId}.` : `Triaged to ${picked.kennel} ${picked.name}'s timeline.`,
        'success',
      );
    } catch {
      // Shown inline from confirm.error.
    }
  };

  const header = (
    <>
      <View style={styles.headerRow}>
        <StatusChip label={chip} tone={reason === 'ai-unavailable' ? 'neutral' : 'warning'} />
        <AppText variant="bodyS" tone="subtle" style={styles.meta}>
          {who}
        </AppText>
      </View>
      <AppText variant="body">{`“${observation.text}”`}</AppText>
    </>
  );

  if (!expanded) {
    return (
      <Pressable
        testID={`review-${id}`}
        accessibilityRole="button"
        accessibilityLabel={`${chip}. ${observation.text}. ${summary}`}
        accessibilityHint="Opens triage for this observation"
        onPress={onExpand}
        style={({ pressed }: { pressed: boolean }) => [pressed && styles.pressed]}
      >
        <Card>
          {header}
          <View style={styles.summaryRow}>
            <AppText variant="bodyS" tone="muted" style={styles.flex}>
              {summary}
            </AppText>
            <Icon name="chevron-forward" size="sm" color={theme.colors.text2} />
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <Card testID={`review-${id}`} outline="primary">
      {header}
      <EvidenceStrip media={observation.media} caption={{ title: 'Observation', meta: `${who} · ${observationRef(observation.id)}` }} />
      <View style={styles.divider} />

      <FormField label="Animal" required>
        <InputButton
          testID={`review-${id}-pick`}
          accessibilityLabel={picked ? `Animal: ${animalTitle(picked)}. Change` : 'Select animal'}
          placeholder="Select animal…"
          open={pickerOpen}
          onPress={() => setPickerOpen(true)}
          value={
            picked ? (
              <>
                <AnimalAvatar animal={picked} size="sm" />
                <KennelCode code={picked.kennel} />
                <AppText variant="titleS" style={styles.flex} numberOfLines={1}>
                  {picked.name}
                </AppText>
              </>
            ) : undefined
          }
        />
      </FormField>
      {candidates.length > 0 ? (
        <View style={styles.candidates}>
          <View style={styles.aiLabel}>
            <Icon name="sparkles-outline" size="xs" color={theme.colors.ai} />
            <AppText variant="label" tone="ai">
              AI candidates
            </AppText>
          </View>
          {candidates.map((c) => (
            <Chip
              key={c.animal.id}
              variant="ai"
              label={`${c.animal.kennel} ${c.animal.name} · ${Math.round(c.confidence * 100)}%`}
              accessibilityHint="Selects this animal"
              onPress={() => setPicked(c.animal)}
              testID={`review-${id}-candidate-${c.animal.id}`}
            />
          ))}
        </View>
      ) : reason === 'low-confidence' && guess ? (
        <AppText variant="bodyS" tone="ai">{`AI guess: ${guess.kennel} ${guess.name} (${Math.round((ai?.match?.confidence ?? 0) * 100)}%)`}</AppText>
      ) : null}

      <FormField label="Case action" required>
        <View accessibilityRole="radiogroup" accessibilityLabel="Case action" style={styles.grid}>
          {GRID.map((value) => {
            const choice = choices.find((c) => c.action === value);
            const disabled = !picked || !choice || choice.disabled;
            return (
              <RadioOption
                key={value}
                compact
                label={value === 'update-case' && choice?.caseId ? `Update ${choice.caseId}` : ACTION_SHORT[value]}
                selected={action === value && !disabled}
                disabled={disabled}
                onPress={() => setAction(value)}
                testID={`review-${id}-routing-${value}`}
              />
            );
          })}
        </View>
      </FormField>
      {!picked ? (
        <AppText variant="bodyS" tone="subtle">
          Pick the animal to see its open and closed cases.
        </AppText>
      ) : null}
      {confirm.error ? (
        <AppText variant="bodyS" tone="danger" accessibilityLiveRegion="polite">
          {confirm.error.message}
        </AppText>
      ) : null}
      <Button label="Confirm triage" disabled={!picked || !chosen} loading={confirm.isPending} onPress={() => void triage()} testID={`review-${id}-confirm`} />
      {ai ? (
        <LinkButton label="Open full AI result" icon="open-outline" onPress={() => router.push({ pathname: '/observation/[id]', params: { id } })} testID={`review-${id}-open`} />
      ) : null}

      <AnimalPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} selectedId={picked?.id ?? null} onSelect={setPicked} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3, flexWrap: 'wrap' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 },
  divider: { height: theme.control.borderWidth, backgroundColor: theme.colors.line },
  aiLabel: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s1 },
  meta: { flex: 1, textAlign: 'right', minWidth: 120 },
  candidates: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.s2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s2 },
  pressed: { opacity: 0.85 },
});