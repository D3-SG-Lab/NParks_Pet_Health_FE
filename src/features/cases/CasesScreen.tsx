import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActor } from '@/auth';
import {
  AppText,
  Button,
  Chip,
  EmptyState,
  ErrorView,
  ListRow,
  ScreenHeader,
  SearchField,
  SkeletonList,
  StatusChip,
  type StatusTone,
} from '@/components';
import type { CaseStatus } from '@/domain/types';
import { AnimalAvatar } from '@/features/animals/AnimalAvatar';
import { OfflineBanner } from '@/features/sync/OfflineBanner';
import { theme } from '@/theme';
import { formatDayMonth, relativeTime } from '@/utils/dates';

import { filterCases, type CaseFilter, type CaseListItem } from './casesApi';
import { useCaseList } from './hooks';

const FILTERS: readonly { value: CaseFilter; label: string; counted: boolean }[] = [
  { value: 'open', label: 'Open', counted: true },
  { value: 'review', label: 'Needs review', counted: true },
  { value: 'last7', label: 'Last 7 days', counted: false },
  { value: 'mine', label: 'Assigned to me', counted: false },
];

export const CASE_STATUS_CHIP: Record<CaseStatus, { label: string; tone: StatusTone }> = {
  review: { label: 'Review', tone: 'warning' },
  open: { label: 'Open', tone: 'info' },
  closed: { label: 'Closed', tone: 'neutral' },
};

/** "C-0142 · updated 10 min ago · Dr Lim", with follow-up overdue, reopened and closed variants. */
export function caseMeta({ healthCase, assignee, overdueFollowUps }: CaseListItem, now: number = Date.now()): string {
  const who = assignee?.name ?? 'unassigned';
  if (healthCase.status === 'closed') {
    return `${healthCase.id} · closed ${formatDayMonth(healthCase.closedAt ?? healthCase.updatedAt)} · ${healthCase.closeReason ?? 'no reason'}`;
  }
  if (overdueFollowUps > 0) return `${healthCase.id} · follow-up overdue · ${who}`;
  if (healthCase.reopenedAt && now - healthCase.reopenedAt < 7 * 24 * 60 * 60_000) {
    return `${healthCase.id} · reopened ${formatDayMonth(healthCase.reopenedAt)} · ${who}`;
  }
  return `${healthCase.id} · updated ${relativeTime(healthCase.updatedAt, now)} · ${who}`;
}

/** Screen 13: Health Cases list (FE-015). Search, filters with counts, list refreshes after any status change. */
export function CasesScreen() {
  const router = useRouter();
  const actor = useActor();
  const cases = useCaseList();
  const [filters, setFilters] = useState<ReadonlySet<CaseFilter>>(() => new Set<CaseFilter>(['open']));
  const [query, setQuery] = useState('');

  const all = useMemo(() => cases.data ?? [], [cases.data]);
  const visible = useMemo(() => filterCases(all, filters, actor.id, query), [all, filters, actor.id, query]);
  const counts = useMemo(
    () => ({
      open: filterCases(all, new Set(['open']), actor.id, '').length,
      review: filterCases(all, new Set(['review']), actor.id, '').length,
    }),
    [all, actor.id],
  );

  const toggle = (value: CaseFilter) =>
    setFilters((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        large
        title="Health Cases"
        below={
          <>
            <SearchField value={query} onChangeText={setQuery} placeholder="Search animal, kennel or case no." testID="cases-search" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filterScroll} accessibilityLabel="Case filters">
              {FILTERS.map((filter) => (
                <Chip
                  key={filter.value}
                  label={filter.label}
                  count={filter.counted && cases.data ? counts[filter.value as 'open' | 'review'] : undefined}
                  selected={filters.has(filter.value)}
                  onPress={() => toggle(filter.value)}
                  testID={`cases-filter-${filter.value}`}
                />
              ))}
            </ScrollView>
          </>
        }
      />
      <OfflineBanner />
      {cases.isPending ? (
        <View style={styles.padded}>
          <SkeletonList label="Loading cases" rows={5} />
        </View>
      ) : cases.isError ? (
        <ErrorView message="Check your connection and try again." onRetry={() => void cases.refetch()} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.healthCase.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={cases.isRefetching} onRefresh={() => void cases.refetch()} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <View style={styles.padded}>
              <EmptyState
                testID="cases-empty"
                icon={filters.has('open') && filters.size === 1 && !query ? 'happy-outline' : 'folder-open-outline'}
                title={filters.has('mine') ? 'No cases assigned to you' : filters.has('open') && filters.size === 1 && !query ? 'No open cases' : 'No cases match'}
                message={
                  filters.has('mine')
                    ? 'Cases assigned to you appear here. Open a case and use Change under “Assigned to” to take it on.'
                    : filters.has('open') && filters.size === 1 && !query
                      ? 'All animals in your kennels are well today.'
                      : 'Try removing a filter or changing the search.'
                }
                action={
                  filters.size > 0 || query ? (
                    <Button
                      label="Show all cases"
                      variant="secondary"
                      size="md"
                      onPress={() => {
                        setFilters(new Set());
                        setQuery('');
                      }}
                      testID="cases-clear-filters"
                    />
                  ) : undefined
                }
              />
            </View>
          }
          renderItem={({ item }) => {
            const chip = CASE_STATUS_CHIP[item.healthCase.status];
            const meta = caseMeta(item);
            const closed = item.healthCase.status === 'closed';
            return (
              <ListRow
                variant="flat"
                testID={`case-row-${item.healthCase.id}`}
                leading={<AnimalAvatar animal={item.animal} muted={closed} />}
                code={item.animal.kennel}
                title={item.animal.name}
                muted={closed}
                body={item.healthCase.finding}
                subtitle={<CaseMetaLine meta={meta} />}
                accessibilityLabel={`${item.animal.kennel} ${item.animal.name}. ${item.healthCase.finding}. ${meta}. ${chip.label}`}
                accessibilityHint="Opens the case"
                trailing={<StatusChip label={chip.label} tone={chip.tone} />}
                onPress={() => router.push({ pathname: '/case/[id]', params: { id: item.healthCase.id } })}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  // One scrolling row of chips that bleeds to the screen edges.
  filterScroll: { marginHorizontal: -theme.spacing.s4 },
  filters: { flexDirection: 'row', gap: theme.spacing.s2, paddingHorizontal: theme.spacing.s4 },
  padded: { padding: theme.spacing.s4 },
  list: { backgroundColor: theme.colors.background },
  listContent: { paddingBottom: theme.spacing.s8, width: '100%', maxWidth: theme.control.contentMaxWidthWide, alignSelf: 'center', flexGrow: 1 },
});
/** Case meta with the case number in mono and "unassigned" called out (screen 13). */
function CaseMetaLine({ meta }: { meta: string }) {
  const [id, ...rest] = meta.split(' · ');
  return (
    <AppText variant="bodyS" tone="muted">
      <AppText variant="mono" tone="muted">
        {id}
      </AppText>
      {rest.map((part, index) => (
        <AppText key={index} variant="bodyS" tone={part === 'unassigned' ? 'warning' : 'muted'} bold={part === 'unassigned'}>
          {` · ${part}`}
        </AppText>
      ))}
    </AppText>
  );
}
