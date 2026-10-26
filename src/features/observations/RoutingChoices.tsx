import { StyleSheet, View } from 'react-native';

import { RadioOption } from '@/components';
import type { ClinicalSign, HealthCase, RoutingAction } from '@/domain/types';
import { theme } from '@/theme';
import { formatDayMonth } from '@/utils/dates';

export interface RoutingChoice {
  action: RoutingAction;
  caseId: string | null;
  label: string;
  description?: string;
  disabled: boolean;
}

/**
 * The four routing actions for an animal's cases. "Update" targets the open case for the same body
 * system (else any open case); "Reopen" the most recently closed one. Unavailable actions are disabled.
 */
export function routingChoices(cases: readonly HealthCase[], signs: readonly ClinicalSign[]): RoutingChoice[] {
  const systems = new Set(signs.map((s) => s.system));
  const open = cases.filter((c) => c.status !== 'closed');
  const openPick = open.find((c) => systems.has(c.system)) ?? open[0];
  const closed = cases.filter((c) => c.status === 'closed').sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0));
  const closedPick = closed.find((c) => systems.has(c.system)) ?? closed[0];
  return [
    { action: 'timeline-only', caseId: null, label: 'Timeline only', disabled: false },
    {
      action: 'update-case',
      caseId: openPick?.id ?? null,
      label: openPick ? `Update case ${openPick.id}` : 'Update open case',
      description: openPick ? `${openPick.finding} · opened ${formatDayMonth(openPick.openedAt)}` : 'No open case for this animal.',
      disabled: !openPick,
    },
    { action: 'new-case', caseId: null, label: 'Create new case', disabled: false },
    {
      action: 'reopen-case',
      caseId: closedPick?.id ?? null,
      label: closedPick ? `Reopen case ${closedPick.id}` : 'Reopen a closed case',
      description: closedPick ? `${closedPick.finding} · closed ${formatDayMonth(closedPick.closedAt ?? closedPick.updatedAt)}` : 'No closed case for this animal.',
      disabled: !closedPick,
    },
  ];
}

interface RoutingChoiceListProps {
  choices: readonly RoutingChoice[];
  value: RoutingAction | null;
  /** The AI-suggested action, badged "AI pick". */
  aiPick?: RoutingAction | null;
  onChange: (choice: RoutingChoice) => void;
  testID?: string;
}

/** Radio list of routing actions; the case details show under the selected or unavailable options. */
export function RoutingChoiceList({ choices, value, aiPick, onChange, testID }: RoutingChoiceListProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Routing" style={styles.list} testID={testID}>
      {choices.map((choice) => (
        <RadioOption
          key={choice.action}
          testID={testID ? `${testID}-${choice.action}` : undefined}
          label={choice.label}
          description={value === choice.action || choice.disabled ? choice.description : undefined}
          badge={aiPick === choice.action && !choice.disabled ? 'AI pick' : undefined}
          selected={value === choice.action}
          disabled={choice.disabled}
          onPress={() => onChange(choice)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing.s2 },
});