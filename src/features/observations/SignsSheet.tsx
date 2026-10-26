import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { BottomSheet, Button, CheckboxRow, LoadingView } from '@/components';
import type { ClinicalSign } from '@/domain/types';
import { theme } from '@/theme';

import { useSigns } from './hooks';

interface SignsSheetProps {
  visible: boolean;
  value: readonly ClinicalSign[];
  onClose: () => void;
  onSave: (signs: ClinicalSign[]) => void;
}

/** Edit the extracted signs against the AQC symptom taxonomy before confirming (FE-012). */
export function SignsSheet({ visible, value, onClose, onSave }: SignsSheetProps) {
  const taxonomy = useSigns();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(value.map((s) => s.code)));
  const [wasVisible, setWasVisible] = useState(visible);

  // Start from the current signs each time the sheet opens (state adjusted during render, not in an effect).
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setSelected(new Set(value.map((s) => s.code)));
  }

  const toggle = (code: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(code);
      else next.delete(code);
      return next;
    });

  return (
    <BottomSheet visible={visible} title="Edit signs" onClose={onClose} testID="signs-sheet">
      {taxonomy.isPending ? (
        <LoadingView label="Loading signs" />
      ) : (
        <ScrollView style={styles.list}>
          {(taxonomy.data ?? []).map((sign) => (
            <CheckboxRow
              key={sign.code}
              label={`${sign.label} · ${sign.system}`}
              checked={selected.has(sign.code)}
              onChange={(on) => toggle(sign.code, on)}
              testID={`sign-${sign.code}`}
            />
          ))}
        </ScrollView>
      )}
      <Button
        label="Save signs"
        testID="signs-save"
        onPress={() => {
          onSave((taxonomy.data ?? []).filter((sign) => selected.has(sign.code)));
          onClose();
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 0, marginBottom: theme.spacing.s2 },
});