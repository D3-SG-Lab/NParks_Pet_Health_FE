import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth';
import {
  Pressable,
  AppText,
  Avatar,
  Banner,
  BottomSheet,
  Button,
  Card,
  CheckboxRow,
  EmptyState,
  ErrorView,
  FadeIn,
  FormField,
  Icon,
  LinkButton,
  PageLayout,
  RadioOption,
  ScreenHeader,
  SectionLabel,
  SegmentedControl,
  SkeletonList,
  StatusChip,
  TextField,
  useToast,
  type SegmentOption,
} from '@/components';
import type { CaseEvent, FollowUpAction, HealthCase } from '@/domain/types';
import { AnimalAvatar } from '@/features/animals/AnimalAvatar';
import { EvidenceStrip } from '@/features/evidence/EvidenceStrip';
import { useGoBack } from '@/navigation/useGoBack';
import { focusRing, theme } from '@/theme';
import { addDaysIso, formatDateTime, formatDayMonth, isoToDdMm, todayIso } from '@/utils/dates';

import { CASE_STATUS_CHIP } from './CasesScreen';
import { CLOSE_REASONS, type CaseDetail } from './casesApi';
import {
  useAddFollowUp,
  useAddNote,
  useAssignCase,
  useAssignableStaff,
  useCaseDetail,
  useCloseCase,
  useMarkReviewed,
  useReopenCase,
  useSetFollowUpDone,
} from './hooks';

type DueIn = '0' | '1' | '3' | '7';
const dueOptions: readonly SegmentOption<DueIn>[] = [
  { value: '0', label: 'Today' },
  { value: '1', label: 'Tomorrow' },
  { value: '3', label: '3 days' },
  { value: '7', label: '7 days' },
];

/** Events that link a record to the case (shown under "Linked observations"). */
const isLinked = (event: CaseEvent) => Boolean(event.observationId || event.inspectionId);

/** Wireframe 14: Case detail (FE-016). Close needs a reason (officers only); reopened cases keep their full history. */
export function CaseDetailScreen({ caseId }: { caseId: string }) {
  const goBack = useGoBack('/cases');
  const detail = useCaseDetail(caseId);
  const header = <ScreenHeader title={`Case ${caseId}`} onBack={goBack} />;

  if (detail.isPending) {
    return (
      <PageLayout header={header}>
        <SkeletonList label="Loading case" rows={4} />
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
  if (!detail.data) {
    return (
      <PageLayout header={header}>
        <EmptyState icon="folder-open-outline" title="Case not found" message="It may have been removed, or the link is wrong." />
      </PageLayout>
    );
  }
  return <CaseBody header={header} detail={detail.data} />;
}

function CaseBody({ header, detail }: { header: ReactNode; detail: CaseDetail }) {
  const router = useRouter();
  const toast = useToast();
  const { role } = useSession();
  const isOfficer = role === 'officer';
  const { healthCase, animal, assignee, summary, pendingObservationId } = detail;
  const caseId = healthCase.id;
  const closed = healthCase.status === 'closed';
  const chip = CASE_STATUS_CHIP[healthCase.status];

  const markReviewed = useMarkReviewed();
  const reopen = useReopenCase();
  const setDone = useSetFollowUpDone();
  const [assignOpen, setAssignOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const newestFirst = [...healthCase.events].reverse();
  const linked = newestFirst.filter(isLinked);
  const notes = newestFirst.filter((e) => e.kind === 'note');
  const history = newestFirst.filter((e) => !isLinked(e) && e.kind !== 'note');
  const observationCount = healthCase.events.filter((e) => e.observationId).length;

  const doReopen = async () => {
    try {
      await reopen.mutateAsync({ caseId });
      toast.show(`Case ${caseId} reopened. Earlier history is kept.`, 'success');
    } catch {
      toast.show("Couldn't reopen the case. Please try again.", 'error');
    }
  };

  return (
    <PageLayout
      header={header}
      hero={
        <>
          <View style={styles.titleBlock}>
            <View style={styles.metaRow}>
              <StatusChip label={chip.label} tone={chip.tone} testID="case-status" />
              <AppText variant="bodyS" tone="muted" style={styles.flex}>
                {`Opened ${formatDayMonth(healthCase.openedAt)} · ${observationCount} ${observationCount === 1 ? 'observation' : 'observations'}`}
              </AppText>
            </View>
            <AppText variant="titleL" accessibilityRole="header">
              {healthCase.finding}
            </AppText>
          </View>

          <Pressable
            testID="case-animal"
            accessibilityRole="button"
            accessibilityLabel={`${animal.kennel} ${animal.name}`}
            accessibilityHint="Opens the animal profile"
            onPress={() => router.push({ pathname: '/animal/[id]', params: { id: animal.id } })}
            style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [styles.animal, pressed && styles.pressed, focused && focusRing]}
          >
            <AnimalAvatar animal={animal} size="sm" />
            <AppText variant="titleS" style={styles.flex}>
              <AppText variant="mono" bold>
                {animal.kennel}
              </AppText>
              {` · ${animal.name}`}
            </AppText>
            <Icon name="chevron-forward" size="sm" color={theme.colors.text2} />
          </Pressable>

          <View style={styles.assigned} testID="case-assignee">
            <AppText tone="muted" style={styles.flex}>
              Assigned to
            </AppText>
            {isOfficer ? (
              <Pressable
                testID="case-reassign"
                accessibilityRole="button"
                accessibilityLabel={`Assigned to ${assignee?.name ?? 'nobody'}. Change`}
                onPress={() => setAssignOpen(true)}
                style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [styles.assignee, pressed && styles.pressed, focused && focusRing]}
              >
                {assignee ? <Avatar name={assignee.name} kind="person" size="sm" /> : null}
                <AppText variant="label" bold tone={assignee ? 'default' : 'warning'}>
                  {assignee?.name ?? 'Unassigned'}
                </AppText>
                <AppText variant="label" bold tone="primary">
                  Change
                </AppText>
              </Pressable>
            ) : (
              <AppText variant="label" bold>
                {assignee?.name ?? 'Unassigned'}
              </AppText>
            )}
          </View>
        </>
      }
      footer={
        isOfficer ? (
          <>
            {closed ? (
              <Button label="Reopen case" variant="secondary" loading={reopen.isPending} onPress={() => void doReopen()} testID="case-reopen" />
            ) : (
              <Button label="Close case…" variant="dangerOutline" onPress={() => setCloseOpen(true)} testID="case-close" />
            )}
            <AppText variant="bodyS" tone="subtle" center>
              {closed ? 'Reopening keeps the full earlier history' : 'Officers only · a closure reason is required'}
            </AppText>
          </>
        ) : undefined
      }
    >
      <FadeIn style={styles.stack}>
        {pendingObservationId ? (
          <Card tone="ai" testID="case-pending-observation">
            <AppText variant="titleS" tone="ai">
              An observation is waiting for confirmation
            </AppText>
            <AppText variant="bodyS" tone="muted">
              The AI suggests adding it to this case. Check the result before it is routed.
            </AppText>
            <Button label="Review AI result" icon="sparkles-outline" size="md" onPress={() => router.push({ pathname: '/observation/[id]', params: { id: pendingObservationId } })} testID="case-review-ai" />
          </Card>
        ) : healthCase.status === 'review' ? (
          <Card tone="warning">
            <AppText variant="titleS" tone="warning">
              This case needs review
            </AppText>
            <Button
              label="Mark as reviewed"
              variant="secondary"
              size="md"
              loading={markReviewed.isPending}
              onPress={() => void markReviewed.mutateAsync({ caseId }).then(() => toast.show('Case marked as reviewed.', 'success'))}
              testID="case-mark-reviewed"
            />
          </Card>
        ) : null}

        <Card tone="ai" testID="case-summary">
          <View style={styles.metaRow}>
            <Icon name="sparkles" size="xs" color={theme.colors.ai} />
            <AppText variant="overline" tone="ai">
              CASE SUMMARY · AI
            </AppText>
          </View>
          <AppText>{summary}</AppText>
        </Card>

        <View style={styles.section} testID="case-follow-ups">
          <SectionLabel>Follow-up actions</SectionLabel>
          <Card style={styles.listCard}>
            {healthCase.followUps.length === 0 ? (
              <AppText tone="muted" style={styles.emptyLine}>
                No follow-up actions yet.
              </AppText>
            ) : (
              healthCase.followUps.map((followUp, index) => (
                <CheckboxRow
                  key={followUp.id}
                  divider={index < healthCase.followUps.length - 1 || !closed}
                  testID={`follow-up-${followUp.id}`}
                  label={followUp.text}
                  checked={followUp.done}
                  // Ignore repeat presses while saving rather than disabling: disabling would flash the disabled
                  // style and drop keyboard focus.
                  onChange={(done) => {
                    if (!setDone.isPending) setDone.mutate({ caseId, followUpId: followUp.id, done });
                  }}
                  trailing={<DueLabel followUp={followUp} />}
                />
              ))
            )}
            {!closed ? (
              <View style={styles.left}>
                <LinkButton label="Add follow-up action" icon="add" onPress={() => setFollowUpOpen(true)} testID="case-add-follow-up" />
              </View>
            ) : null}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionLabel>Linked observations</SectionLabel>
          {linked.length === 0 ? (
            <AppText tone="muted">No observations linked yet.</AppText>
          ) : (
            <Card testID="case-events" style={styles.linkedCard}>
              {linked.map((event, index) => (
                <LinkedRow key={event.id} event={event} last={index === linked.length - 1} />
              ))}
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>{`Evidence · ${healthCase.evidence.length}`}</SectionLabel>
          {healthCase.evidence.length > 0 ? (
            <EvidenceStrip
              media={healthCase.evidence}
              size="grid"
              caption={{ title: `${healthCase.finding.split(' — ')[0]} · ${animal.kennel} ${animal.name}`, meta: `Case ${caseId} · opened ${formatDayMonth(healthCase.openedAt)}` }}
              testID="case-evidence"
            />
          ) : (
            <AppText tone="muted">No photos or videos linked yet.</AppText>
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>Notes</SectionLabel>
          {notes.map((note) => (
            <Card key={note.id} style={styles.note}>
              <AppText variant="caption" tone="muted">
                <AppText variant="caption" bold>
                  {note.by}
                </AppText>
                {' · '}
                <AppText variant="mono" tone="muted" style={styles.small}>
                  {formatDateTime(note.at)}
                </AppText>
              </AppText>
              <AppText>{note.detail}</AppText>
            </Card>
          ))}
          <NoteComposer caseId={caseId} />
        </View>

        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: historyOpen }}
            accessibilityLabel={`Case history, ${history.length} events`}
            onPress={() => setHistoryOpen((v) => !v)}
            style={styles.historyToggle}
            testID="case-history-toggle"
          >
            <SectionLabel>{`Case history · ${history.length}`}</SectionLabel>
            <Icon name={historyOpen ? 'chevron-up' : 'chevron-down'} size="sm" color={theme.colors.text2} />
          </Pressable>
          {historyOpen
            ? history.map((event) => (
                <View key={event.id} style={styles.historyRow}>
                  <AppText>{event.title}</AppText>
                  <AppText variant="bodyS" tone="muted">{`${formatDateTime(event.at)} · ${event.by}${event.detail ? ` · ${event.detail}` : ''}`}</AppText>
                </View>
              ))
            : null}
        </View>
      </FadeIn>

      <AssignSheet visible={assignOpen} onClose={() => setAssignOpen(false)} healthCase={healthCase} />
      <FollowUpSheet visible={followUpOpen} onClose={() => setFollowUpOpen(false)} caseId={caseId} />
      <CloseSheet visible={closeOpen} onClose={() => setCloseOpen(false)} caseId={caseId} />
    </PageLayout>
  );
}

function DueLabel({ followUp }: { followUp: FollowUpAction }) {
  const today = todayIso();
  if (followUp.done) {
    return (
      <AppText variant="mono" tone="subtle">
        {isoToDdMm(followUp.dueDate)}
      </AppText>
    );
  }
  if (followUp.dueDate < today) return <StatusChip label={`Overdue · ${isoToDdMm(followUp.dueDate)}`} tone="danger" dot={false} />;
  if (followUp.dueDate === today) return <StatusChip label="Due today" tone="danger" dot={false} />;
  return <StatusChip label={`Due ${isoToDdMm(followUp.dueDate)}`} tone="neutral" />;
}

function LinkedRow({ event, last }: { event: CaseEvent; last: boolean }) {
  const router = useRouter();
  const byAi = event.kind === 'observation' && event.title.includes('AI');
  const extra = event.kind === 'opened' ? ' · case created' : event.kind === 'reopened' ? ' · case reopened' : '';
  const meta = `${formatDateTime(event.at)} · ${event.by}${byAi ? ' · routed by AI' : extra}`;
  const caseEvent = event.kind === 'opened' || event.kind === 'reopened';
  const text = event.kind === 'inspection' ? event.title : (event.detail ?? event.title);
  const content = (
    <>
      <View style={styles.rail}>
        <View style={[styles.dot, caseEvent && styles.dotCase]} />
        {!last ? <View style={styles.line} /> : null}
      </View>
      <View style={[styles.flex, styles.linkedBody]}>
        <AppText variant="caption" tone="muted">
          <AppText variant="mono" tone="muted">
            {formatDateTime(event.at)}
          </AppText>
          {` · ${event.by}${extra}`}
          {byAi ? (
            <AppText variant="label" bold tone="ai">
              {' routed by AI'}
            </AppText>
          ) : null}
        </AppText>
        <AppText>{text}</AppText>
      </View>
    </>
  );
  if (!event.observationId) {
    return (
      <View style={styles.linked} accessible accessibilityLabel={`${meta}. ${text}`}>
        {content}
      </View>
    );
  }
  const observationId = event.observationId;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${meta}. ${text}`}
      accessibilityHint="Opens the observation"
      onPress={() => router.push({ pathname: '/observation/[id]', params: { id: observationId } })}
      style={({ pressed }: { pressed: boolean }) => [styles.linked, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

function NoteComposer({ caseId }: { caseId: string }) {
  const toast = useToast();
  const addNote = useAddNote();
  const [note, setNote] = useState('');
  const post = async () => {
    if (!note.trim() || addNote.isPending) return;
    try {
      await addNote.mutateAsync({ caseId, text: note });
      setNote('');
      toast.show('Note posted to the case.', 'success');
    } catch {
      toast.show("Couldn't post the note. Please try again.", 'error');
    }
  };
  const disabled = !note.trim() || addNote.isPending;
  return (
    <TextField
      label="Add a note"
      hideLabel
      testID="case-note"
      value={note}
      onChangeText={setNote}
      placeholder="Add a note…"
      returnKeyType="send"
      onSubmitEditing={() => void post()}
      accessory={
        <Button label="Post" accessibilityLabel="Post note" disabled={disabled} loading={addNote.isPending} onPress={() => void post()} testID="case-save-note" />
      }
    />
  );
}

function AssignSheet({ visible, onClose, healthCase }: { visible: boolean; onClose: () => void; healthCase: HealthCase }) {
  const toast = useToast();
  const staff = useAssignableStaff();
  const assign = useAssignCase();
  return (
    <BottomSheet visible={visible} title="Assign case" onClose={onClose} scroll testID="assign-sheet">
      {staff.isPending ? (
        <SkeletonList label="Loading staff" rows={3} />
      ) : (
        <View accessibilityRole="radiogroup" accessibilityLabel="Assign to" style={styles.options}>
          {(staff.data ?? []).map((member) => (
            <RadioOption
              key={member.id}
              testID={`assign-${member.id}`}
              label={member.name}
              description={member.role === 'vet' ? 'Vet' : member.role === 'supervisor' ? 'Supervisor' : 'Officer'}
              selected={member.id === healthCase.assigneeId}
              onPress={() =>
                !assign.isPending &&
                void assign
                  .mutateAsync({ caseId: healthCase.id, staffId: member.id })
                  .then(() => {
                    toast.show(`Assigned to ${member.name}.`, 'success');
                    onClose();
                  })
                  .catch(() => toast.show("Couldn't reassign the case.", 'error'))
              }
            />
          ))}
        </View>
      )}
    </BottomSheet>
  );
}

function FollowUpSheet({ visible, onClose, caseId }: { visible: boolean; onClose: () => void; caseId: string }) {
  const toast = useToast();
  const add = useAddFollowUp();
  const [text, setText] = useState('');
  const [dueIn, setDueIn] = useState<DueIn>('1');
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    if (!text.trim()) {
      setError('Describe the follow-up action.');
      return;
    }
    try {
      await add.mutateAsync({ caseId, text, dueDate: addDaysIso(todayIso(), Number(dueIn)) });
      toast.show('Follow-up action added.', 'success');
      setText('');
      setError(undefined);
      onClose();
    } catch {
      setError("Couldn't add the follow-up. Please try again.");
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Add follow-up action"
      onClose={onClose}
      scroll
      testID="follow-up-sheet"
      footer={<Button label="Add follow-up" style={styles.flex} loading={add.isPending} onPress={() => void submit()} testID="follow-up-add" />}
    >
      <TextField label="Action" required placeholder="e.g. Recheck stool at PM inspection" value={text} onChangeText={setText} error={error} testID="follow-up-text" />
      <FormField label="Due">
        <SegmentedControl label="Due" options={dueOptions} value={dueIn} onChange={setDueIn} testID="follow-up-due" />
      </FormField>
    </BottomSheet>
  );
}

function CloseSheet({ visible, onClose, caseId }: { visible: boolean; onClose: () => void; caseId: string }) {
  const toast = useToast();
  const close = useCloseCase();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showError, setShowError] = useState(false);

  const submit = async () => {
    if (!reason) {
      setShowError(true);
      return;
    }
    try {
      await close.mutateAsync({ caseId, reason, note });
      toast.show(`Case ${caseId} closed · ${reason}.`, 'success');
      onClose();
    } catch {
      // Shown below from close.error.
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Close case"
      onClose={onClose}
      scroll
      testID="close-sheet"
      footer={
        <>
          <Button label="Cancel" variant="secondary" style={styles.flex} onPress={onClose} />
          <Button label="Close case" style={styles.flex} loading={close.isPending} onPress={() => void submit()} testID="close-confirm" />
        </>
      }
    >
      <AppText tone="muted">A reason is required. The case can be reopened later with its full history.</AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Reason for closing" style={styles.options}>
        {CLOSE_REASONS.map((value) => (
          <RadioOption
            key={value}
            label={value}
            selected={reason === value}
            onPress={() => {
              setReason(value);
              setShowError(false);
            }}
            testID={`close-reason-${value}`}
          />
        ))}
      </View>
      {showError ? (
        <AppText tone="danger" accessibilityRole="alert" testID="close-reason-error">
          Choose a reason for closing the case.
        </AppText>
      ) : null}
      <TextField label="Closing note" optional multiline placeholder="Anything the next reader should know" value={note} onChangeText={setNote} />
      {close.error ? <Banner kind="error" message={close.error.message} /> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: theme.spacing.s1 },
  stack: { gap: theme.spacing.s6 },
  section: { gap: theme.spacing.s2 },
  titleBlock: { gap: theme.spacing.s2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 },
  animal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    minHeight: theme.control.buttonLarge,
    padding: theme.spacing.s3,
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.background,
  },
  pressed: { backgroundColor: theme.colors.surface2 },
  assigned: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 },
  assignee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
    minHeight: theme.control.minTouch,
    paddingLeft: theme.spacing.s1,
    paddingRight: theme.spacing.s4,
    borderRadius: theme.radius.pill,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.lineStrong,
    backgroundColor: theme.colors.surface,
  },
  listCard: { paddingVertical: theme.spacing.s1, gap: 0 },
  emptyLine: { paddingVertical: theme.spacing.s3 },
  left: { alignItems: 'flex-start', paddingVertical: theme.spacing.s1 },
  linkedCard: { gap: 0 },
  small: { fontSize: theme.text.caption.fontSize },
  linked: { flexDirection: 'row', gap: theme.spacing.s3 },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: theme.control.dot + 2, height: theme.control.dot + 2, borderRadius: theme.radius.pill, backgroundColor: theme.colors.abnormal, marginTop: 3 },
  dotCase: { backgroundColor: theme.colors.secondary },
  line: { flex: 1, width: 1.5, backgroundColor: theme.colors.line, marginTop: theme.spacing.s1 },
  linkedBody: { paddingBottom: theme.spacing.s3 },
  note: { gap: theme.spacing.s1, padding: theme.spacing.s3 },
  historyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: theme.control.minTouch },
  historyRow: { gap: theme.spacing.s1, paddingVertical: theme.spacing.s2, borderBottomWidth: theme.control.borderWidth, borderBottomColor: theme.colors.line },
  options: { gap: theme.spacing.s2 },
});