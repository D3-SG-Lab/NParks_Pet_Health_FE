import { useMemo, useState } from 'react';
import { ScrollView, SectionList, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth';
import {
  Pressable,
  AppText,
  Chip,
  ErrorView,
  FullScreenModal,
  Icon,
  KennelCode,
  SearchField,
  SectionLabel,
  SkeletonList,
  StatusChip,
  type StatusTone,
} from '@/components';
import { animalTitle, formatMicrochip } from '@/domain/describe';
import type { Animal } from '@/domain/types';
import { mockContractorKennelsLabel } from '@/features/animals/scopeLabel';
import { focusRing, theme } from '@/theme';

import { AnimalAvatar } from './AnimalAvatar';
import { filterAnimals, type AnimalFilter, type AnimalListItem } from './animalsApi';
import { useAnimalList, useMarkAnimalRecent, useRecentAnimalIds } from './hooks';

export interface PickerStatus {
  label: string;
  tone: StatusTone;
}

interface AnimalPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (animal: Animal) => void;
  /** Currently selected animal, marked with a tick. */
  selectedId?: string | null;
  title?: string;
  /** Right-hand status chip; defaults to Unwell / "PM due" / Active. */
  statusFor?: (item: AnimalListItem) => PickerStatus;
}

interface Section {
  key: string;
  title: string;
  data: AnimalListItem[];
}

const FILTERS: readonly { value: AnimalFilter; label: string }[] = [
  { value: 'all', label: 'All active' },
  { value: 'due', label: 'Check due' },
  { value: 'unwell', label: 'Unwell' },
];

export function defaultPickerStatus(item: AnimalListItem): PickerStatus {
  if (item.unwell) return { label: 'Unwell', tone: 'abnormal' };
  if (!item.sessionDone) return { label: `${item.session} due`, tone: 'neutral' };
  return { label: 'Active', tone: 'success' };
}

/**
 * Screen 3: Animal picker & search (FE-006). Search by kennel code, name or microchip as you type;
 * recent animals first, then kennel blocks. Used by inspections, observations, medication and AI routing.
 */
export function AnimalPicker({ visible, onClose, onSelect, selectedId, title = 'Select animal', statusFor = defaultPickerStatus }: AnimalPickerProps) {
  const { role } = useSession();
  const list = useAnimalList();
  const recent = useRecentAnimalIds();
  const markRecent = useMarkAnimalRecent();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AnimalFilter>('all');

  const sections = useMemo<Section[]>(() => {
    const items = filterAnimals(list.data ?? [], query, filter);
    const byId = new Map(items.map((item) => [item.animal.id, item]));
    const result: Section[] = [];
    if (!query.trim() && filter === 'all') {
      const recentItems = (recent.data ?? []).flatMap((id) => {
        const item = byId.get(id);
        return item ? [item] : [];
      });
      if (recentItems.length > 0) result.push({ key: 'recent', title: 'Recent', data: recentItems });
    }
    const blocks = new Map<string, AnimalListItem[]>();
    for (const item of items) {
      const block = item.animal.kennel.split('-')[0] ?? item.animal.kennel;
      blocks.set(block, [...(blocks.get(block) ?? []), item]);
    }
    for (const [block, data] of blocks) result.push({ key: `block-${block}`, title: `Kennel block ${block}`, data });
    return result;
  }, [list.data, recent.data, query, filter]);

  const close = () => {
    setQuery('');
    setFilter('all');
    onClose();
  };

  const choose = (animal: Animal) => {
    markRecent.mutate(animal.id);
    setQuery('');
    setFilter('all');
    onSelect(animal);
    onClose();
  };

  return (
    <FullScreenModal visible={visible} title={title} onClose={close} testID="animal-picker">
      <View style={styles.top}>
        <SearchField
          testID="animal-picker-search"
          value={query}
          onChangeText={setQuery}
          autoFocus
          placeholder="Kennel code, name or microchip"
          label="Search animals by kennel code, name or microchip"
        />
        {role === 'contractor' ? (
          <View style={styles.scope}>
            <Icon name="lock-closed-outline" size="sm" color={theme.colors.text2} />
            <AppText variant="bodyS" tone="muted" style={styles.flex}>
              {`Contractor view: showing kennels assigned to you (${mockContractorKennelsLabel})`}
            </AppText>
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={filter === option.value}
              onPress={() => setFilter(option.value)}
              testID={`animal-filter-${option.value}`}
            />
          ))}
        </ScrollView>
      </View>
      {list.isPending ? (
        <View style={styles.padded}>
          <SkeletonList label="Loading animals" rows={5} />
        </View>
      ) : list.isError ? (
        <ErrorView message="Check your connection and try again." onRetry={() => void list.refetch()} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.animal.id}-${index}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <SectionLabel trailing={section.key === sections[0]?.key ? matchCount(sections) : undefined}>{section.title}</SectionLabel>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty} testID="animal-picker-empty">
              <AppText variant="titleS" center>
                No animals found
              </AppText>
              <AppText variant="bodyS" tone="muted" center>
                {query.trim() ? `Nothing matches “${query.trim()}”. Try a kennel code like KC2-2.` : 'No animals match this filter.'}
              </AppText>
            </View>
          }
          renderItem={({ item, section }) => {
            const status = statusFor(item);
            const selected = item.animal.id === selectedId;
            return (
              <Pressable
                testID={`animal-option-${section.key}-${item.animal.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${animalTitle(item.animal)}, ${item.animal.species}, microchip ${item.animal.microchip}, ${status.label}`}
                accessibilityState={{ selected }}
                onPress={() => choose(item.animal)}
                style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [styles.row, selected && styles.selected, pressed && styles.pressed, focused && focusRing]}
              >
                <AnimalAvatar animal={item.animal} />
                <View style={styles.flex}>
                  <View style={styles.identity}>
                    <KennelCode code={item.animal.kennel} highlight={query} />
                    <AppText variant="titleS" style={styles.name}>
                      {item.animal.name}
                    </AppText>
                  </View>
                  <AppText variant="bodyS" tone="muted">
                    {`${item.animal.species} · `}
                    <AppText variant="mono" tone="muted">
                      {formatMicrochip(item.animal.microchip)}
                    </AppText>
                  </AppText>
                </View>
                <StatusChip label={status.label} tone={status.tone} />
                {selected ? <Icon name="checkmark" size="sm" color={theme.colors.primary} /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 2 },
  identity: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: theme.spacing.s2, rowGap: 2 },
  name: { flexShrink: 1 },
  top: {
    paddingHorizontal: theme.spacing.s4,
    paddingTop: theme.spacing.s4,
    paddingBottom: theme.spacing.s4,
    gap: theme.spacing.s3,
    alignSelf: 'center',
    width: '100%',
    maxWidth: theme.control.formMaxWidth,
  },
  scope: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.s2,
    padding: theme.spacing.s3,
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.background,
  },
  filters: { gap: theme.spacing.s2 },
  padded: { padding: theme.spacing.s4 },
  list: { borderTopWidth: theme.control.borderWidth, borderTopColor: theme.colors.line, paddingHorizontal: theme.spacing.s4, paddingBottom: theme.spacing.s8, alignSelf: 'center', width: '100%', maxWidth: theme.control.formMaxWidth },
  sectionHeader: { paddingTop: theme.spacing.s4, paddingBottom: theme.spacing.s1, backgroundColor: theme.colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    minHeight: theme.control.minTouch,
    paddingVertical: theme.spacing.s3,
    borderBottomWidth: theme.control.borderWidth,
    borderBottomColor: theme.colors.line,
  },
  selected: { backgroundColor: theme.colors.primarySoft },
  pressed: { backgroundColor: theme.colors.surface2 },
  empty: { padding: theme.spacing.s6, gap: theme.spacing.s2 },
});
/** "6 matches" — distinct animals across the sections (Recent repeats some). */
function matchCount(sections: readonly Section[]): string {
  const count = new Set(sections.flatMap((section) => section.data.map((item) => item.animal.id))).size;
  return `${count} ${count === 1 ? 'match' : 'matches'}`;
}
