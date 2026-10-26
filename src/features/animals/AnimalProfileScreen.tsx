import { useRouter } from 'expo-router';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Pressable,
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorView,
  FadeIn,
  Icon,
  PageLayout,
  ProgressBar,
  ScreenHeader,
  SectionLabel,
  SkeletonList,
  StatusChip,
  useToast,
  type IconName,
} from '@/components';
import type { SummaryCitation, TimelineEntry, TimelineKind } from '@/domain/types';
import { EvidenceStrip } from '@/features/evidence/EvidenceStrip';
import { useGoBack } from '@/navigation/useGoBack';
import { focusRing, shadow, theme } from '@/theme';
import { dayHeading, formatDayMonth, formatTime, isoToDdMm, relativeTime } from '@/utils/dates';

import { AnimalAvatar } from './AnimalAvatar';
import type { AnimalProfile, TodayCheck } from './animalsApi';
import { exportProfilePdf } from './exportProfile';
import { useAnimalProfile, useCountryName } from './hooks';
import { RecordSheet } from './RecordSheet';

type RecordFilter = 'all' | 'inspection' | 'observation' | 'medication' | 'case';

const FILTERS: readonly { value: RecordFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'inspection', label: 'Inspections' },
  { value: 'observation', label: 'Observations' },
  { value: 'medication', label: 'Medication' },
  { value: 'case', label: 'Cases' },
];

/** Timeline dot colours by record type (screen 7). */
const DOT: Record<TimelineKind, string> = {
  inspection: theme.colors.success,
  medication: theme.colors.primary,
  observation: theme.colors.abnormal,
  case: theme.colors.secondary,
  exam: theme.colors.text3,
};

const PAGE_SIZE = 15;

/** Screen 7: Animal Profile (FE-014). Today's checks, actions, cited AI summary, open case and health record. */
export function AnimalProfileScreen({ animalId }: { animalId: string }) {
  const goBack = useGoBack('/');
  const profile = useAnimalProfile(animalId);
  const header = <ScreenHeader title="Animal Profile" onBack={goBack} />;

  if (profile.isPending) {
    return (
      <PageLayout header={header}>
        <SkeletonList label="Loading animal" rows={4} />
      </PageLayout>
    );
  }
  if (profile.isError) {
    return (
      <PageLayout header={header}>
        <ErrorView message={profile.error.message || 'Check your connection and try again.'} onRetry={() => void profile.refetch()} />
      </PageLayout>
    );
  }
  if (!profile.data) {
    return (
      <PageLayout header={header}>
        <EmptyState icon="paw-outline" title="Animal not found" message="It may have been released, or the link is wrong." />
      </PageLayout>
    );
  }
  return <ProfileBody header={header} profile={profile.data} />;
}

function ProfileBody({ header, profile }: { header: ReactNode; profile: AnimalProfile }) {
  const router = useRouter();
  const toast = useToast();
  const { animal, summary, timeline, openCases, today } = profile;
  const country = useCountryName(animal.countryCode);
  const [filter, setFilter] = useState<RecordFilter>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [openEntry, setOpenEntry] = useState<TimelineEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(
    () => timeline.filter((entry) => (filter === 'all' ? true : filter === 'inspection' ? entry.kind === 'inspection' || entry.kind === 'exam' : entry.kind === filter)),
    [timeline, filter],
  );
  const groups = useMemo(() => {
    const result: { heading: string; entries: TimelineEntry[] }[] = [];
    for (const entry of filtered.slice(0, limit)) {
      const heading = dayHeading(entry.at);
      const last = result.at(-1);
      if (last && last.heading === heading) last.entries.push(entry);
      else result.push({ heading, entries: [entry] });
    }
    return result;
  }, [filtered, limit]);

  const openCitation = (citation: SummaryCitation) => {
    if (citation.kind === 'case') {
      router.push({ pathname: '/case/[id]', params: { id: citation.id } });
      return;
    }
    const entry = timeline.find((e) => e.id === citation.id);
    if (entry) setOpenEntry(entry);
  };

  const openTimelineEntry = (entry: TimelineEntry) => {
    if (entry.kind === 'case' && entry.caseId) router.push({ pathname: '/case/[id]', params: { id: entry.caseId } });
    else setOpenEntry(entry);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportProfilePdf(profile);
      toast.show(result === 'shared' ? 'Health record PDF ready to share.' : 'Print dialog opened. Choose “Save as PDF”.', 'success');
    } catch {
      toast.show("Couldn't create the PDF. Please try again.", 'error');
    } finally {
      setExporting(false);
    }
  };

  const unwell = openCases.length > 0;
  const sex = animal.sex === 'Female' ? 'F' : animal.sex === 'Male' ? 'M' : 'Sex unknown';
  const stayDay = profile.stayLength ? Math.min(profile.stayDay, profile.stayLength) : profile.stayDay;
  const stay = profile.stayLength ? `Day ${stayDay} of ${profile.stayLength}` : `Day ${profile.stayDay}`;
  const release = animal.releaseDate ? `Release ${isoToDdMm(animal.releaseDate)}` : 'Release date not set';

  const identity = (
    <View style={styles.identityBlock}>
      <View style={styles.identity} testID="profile-identity">
        <AnimalAvatar animal={animal} size="lg" showCamera />
        <View style={styles.identityText}>
          <AppText variant="titleL" accessibilityRole="header">
            {animal.name}
          </AppText>
          <AppText variant="bodyS" tone="muted">
            <AppText variant="mono" bold tone="primary">
              {animal.kennel}
            </AppText>
            {` · ${[animal.species, sex, country].filter(Boolean).join(' · ')}`}
          </AppText>
          <StatusChip label={unwell ? 'Unwell · monitoring' : 'Active monitoring'} tone={unwell ? 'abnormal' : 'success'} testID="profile-status" />
        </View>
      </View>
      <View style={styles.stay} accessible accessibilityLabel={`${stay}. ${release}`}>
        <View style={styles.stayLabels}>
          <AppText variant="label" bold>
            {stay}
          </AppText>
          <AppText variant="bodyS" tone="muted">
            {release}
          </AppText>
        </View>
        {profile.stayLength ? <ProgressBar value={stayDay / profile.stayLength} label="Quarantine stay progress" /> : null}
      </View>
    </View>
  );

  return (
    <PageLayout header={header} hero={identity}>
      <FadeIn style={styles.stack}>
        <View style={styles.section}>
          <SectionLabel>Today</SectionLabel>
          <View style={styles.statusRow}>
            <TodayTile label="Arrival exam" check={today.arrivalExam} doneLabel="Done" />
            <TodayTile label="AM inspection" check={today.am} />
            <TodayTile label="PM inspection" check={today.pm} />
          </View>
          <View style={styles.actions}>
            <QuickAction label="Inspect" icon="clipboard-outline" onPress={() => router.push({ pathname: '/inspect/[animalId]', params: { animalId: animal.id } })} testID="profile-inspect" />
            <QuickAction label="Observe" icon="camera-outline" onPress={() => router.push({ pathname: '/new-observation', params: { animalId: animal.id } })} testID="profile-observe" />
            <QuickAction label="Medicate" icon="pill" onPress={() => router.push({ pathname: '/medicate/[animalId]', params: { animalId: animal.id } })} testID="profile-medicate" />
            <QuickAction label="Export PDF" icon="download-outline" loading={exporting} onPress={() => void handleExport()} testID="profile-export" />
          </View>
        </View>

        <Card tone="ai" testID="profile-summary">
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <Icon name="sparkles" size="sm" color={theme.colors.onPrimary} />
            </View>
            <AppText variant="titleS" tone="ai" style={styles.aiTitle}>
              AI 30-day summary
            </AppText>
            <AppText variant="bodyS" tone="subtle">
              {relativeTime(summary.updatedAt)}
            </AppText>
          </View>
          <View style={styles.statements}>
            {summary.statements.map((statement, i) => (
              <View key={i} style={styles.statement}>
                <AppText style={styles.bullet}>•</AppText>
                <AppText style={styles.statementBody}>
                  {statement.text}
                  {statement.refs.map((ref) => {
                    const source = summary.sources[ref - 1];
                    return source ? (
                      <Fragment key={ref}>
                        {' '}
                        <Chip
                          variant="citation"
                          label={String(ref)}
                          accessibilityLabel={`Source ${ref}: ${source.label}`}
                          onPress={() => openCitation(source)}
                          testID={`citation-${source.id}`}
                        />
                      </Fragment>
                    ) : null;
                  })}
                </AppText>
              </View>
            ))}
          </View>
          <AppText variant="caption" tone="muted">
            AI-generated from this animal’s records. Tap a citation to open the source.
          </AppText>
        </Card>

        {openCases.map((c) => (
          <Pressable
            key={c.id}
            testID={`profile-case-${c.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Case ${c.id}, ${c.finding}, ${c.status === 'review' ? 'review' : 'open'}`}
            accessibilityHint="Opens the case"
            onPress={() => router.push({ pathname: '/case/[id]', params: { id: c.id } })}
            style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [styles.caseRow, pressed && styles.pressed, focused && focusRing]}
          >
            <Icon name="folder-outline" size="sm" color={theme.colors.primary} />
            <AppText style={styles.flex} numberOfLines={2}>
              <AppText variant="mono" bold>
                {c.id}
              </AppText>
              {` · ${c.finding}`}
            </AppText>
            <StatusChip label={c.status === 'review' ? 'Review' : 'Open'} tone={c.status === 'review' ? 'warning' : 'info'} />
            <Icon name="chevron-forward" size="sm" color={theme.colors.text2} />
          </Pressable>
        ))}

        <View style={styles.section}>
          <SectionLabel>Health record</SectionLabel>
          <View style={styles.filters}>
            {FILTERS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={filter === option.value}
                onPress={() => {
                  setFilter(option.value);
                  setLimit(PAGE_SIZE);
                }}
                testID={`record-filter-${option.value}`}
              />
            ))}
          </View>
          {filtered.length === 0 ? (
            <AppText tone="muted" testID="record-empty">
              No records of this type yet.
            </AppText>
          ) : (
            <Card testID="record-list" style={styles.groups}>
              {groups.map((group, groupIndex) => (
                <View key={group.heading} style={[styles.group, groupIndex > 0 && styles.groupDivider]}>
                  <AppText variant="label" bold accessibilityRole="header">
                    {group.heading}
                  </AppText>
                  <View>
                    {group.entries.map((entry, index) => (
                      <TimelineRow key={entry.id} entry={entry} last={index === group.entries.length - 1} onPress={() => openTimelineEntry(entry)} />
                    ))}
                  </View>
                </View>
              ))}
            </Card>
          )}
          {filtered.length > limit ? (
            <Button label={`Show older records (${filtered.length - limit})`} variant="secondary" size="md" onPress={() => setLimit((l) => l + PAGE_SIZE)} testID="record-more" />
          ) : null}
        </View>
      </FadeIn>
      <RecordSheet entry={openEntry} animalTitle={`${animal.kennel} ${animal.name}`} onClose={() => setOpenEntry(null)} />
    </PageLayout>
  );
}

function TodayTile({ label, check, doneLabel }: { label: string; check: TodayCheck; doneLabel?: string }) {
  const done = check.status === 'done';
  const value = done ? (doneLabel ?? (check.at ? formatTime(check.at) : 'Done')) : `Due ${check.time ?? ''}`.trim();
  return (
    <View style={[styles.tile, !done && styles.tileDue]} accessible accessibilityLabel={`${label}: ${done ? `done${check.at && !doneLabel ? ` at ${formatTime(check.at)}` : ''}` : value}`}>
      <AppText variant="bodyS" tone="muted" numberOfLines={2}>
        {label}
      </AppText>
      <View style={styles.tileValue}>
        {done ? <Icon name="checkmark" size="xs" color={theme.colors.success} /> : null}
        <AppText variant="titleS" tone={done ? 'success' : 'warning'} numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

interface QuickActionProps {
  label: string;
  icon: IconName;
  onPress: () => void;
  loading?: boolean;
  testID: string;
}

/** Profile quick action: icon tile over a label, four in a row. */
function QuickAction({ label, icon, onPress, loading = false, testID }: QuickActionProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [styles.quick, pressed && styles.pressed, focused && focusRing]}
    >
      <View style={styles.quickIcon}>
        {loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Icon name={icon} size="sm" color={theme.colors.primaryStrong} />}
      </View>
      <AppText variant="label" bold center numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {label}
      </AppText>
    </Pressable>
  );
}

function TimelineRow({ entry, last, onPress }: { entry: TimelineEntry; last: boolean; onPress: () => void }) {
  const color = DOT[entry.kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}, ${formatDayMonth(entry.at)} ${formatTime(entry.at)}. ${entry.text}`}
      accessibilityHint={entry.kind === 'case' ? 'Opens the case' : 'Opens the record'}
      onPress={onPress}
      testID={`record-${entry.id}`}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [styles.entry, pressed && styles.pressed, focused && focusRing]}
    >
      <AppText variant="mono" tone="muted" style={styles.time}>
        {formatTime(entry.at)}
      </AppText>
      <View style={styles.rail}>
        <View style={[styles.dot, { borderColor: color }]}>
          <View style={[styles.dotCore, { backgroundColor: color }]} />
        </View>
        {!last ? <View style={styles.line} /> : null}
      </View>
      <View style={[styles.flex, styles.entryBody, last && styles.entryLast]}>
        <AppText variant="titleS">{entry.title}</AppText>
        <AppText variant="bodyS" tone="muted">
          {entry.text}
        </AppText>
        {/* Plain thumbnails: the row itself is the button; the record sheet has the viewer. */}
        {entry.media.length > 0 ? (
          <EvidenceStrip media={entry.media} caption={{ title: entry.title, meta: '' }} size="sm" interactive={false} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  stack: { gap: theme.spacing.s6 },
  section: { gap: theme.spacing.s3 },
  identityBlock: { gap: theme.spacing.s4 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s4 },
  identityText: { flex: 1, minWidth: 0, gap: theme.spacing.s1 },
  stay: { gap: theme.spacing.s2 },
  stayLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: theme.spacing.s2, flexWrap: 'wrap' },
  statusRow: { flexDirection: 'row', gap: theme.spacing.s2 },
  tile: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing.s1,
    padding: theme.spacing.s3,
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
  },
  tileDue: { borderStyle: 'dashed', borderColor: theme.colors.warning, backgroundColor: theme.colors.warningSoft },
  tileValue: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s1 },
  actions: { flexDirection: 'row', gap: theme.spacing.s2 },
  quick: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: theme.spacing.s2,
    paddingVertical: theme.spacing.s3,
    paddingHorizontal: theme.spacing.s1,
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
  },
  quickIcon: {
    width: theme.control.iconBadge,
    height: theme.control.iconBadge,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.ai,
  },
  aiTitle: { flex: 1 },
  statements: { gap: theme.spacing.s2 },
  statement: { flexDirection: 'row', gap: theme.spacing.s2 },
  bullet: { width: 10 },
  statementBody: { flex: 1 },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    minHeight: theme.control.buttonLarge + 4,
    paddingHorizontal: theme.spacing.s4,
    borderRadius: theme.radius.xl,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
    ...shadow(1),
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s2 },
  groups: { gap: 0 },
  group: { gap: theme.spacing.s3 },
  groupDivider: { marginTop: theme.spacing.s4, paddingTop: theme.spacing.s4, borderTopWidth: theme.control.borderWidth, borderTopColor: theme.colors.line },
  entry: { flexDirection: 'row', gap: theme.spacing.s3, borderRadius: theme.radius.md },
  time: { width: 44, paddingTop: 2 },
  rail: { width: 16, alignItems: 'center' },
  dot: {
    width: 16,
    height: 16,
    marginTop: 3,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  dotCore: { width: 6, height: 6, borderRadius: theme.radius.pill },
  line: { flex: 1, width: 1.5, backgroundColor: theme.colors.line, marginTop: 2 },
  entryBody: { paddingBottom: theme.spacing.s4 },
  entryLast: { paddingBottom: 0 },
  pressed: { backgroundColor: theme.colors.surface2 },
});
