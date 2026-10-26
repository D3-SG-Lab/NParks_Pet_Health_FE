import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, LinkButton, Pressable } from '@/components';
import { animalTitle } from '@/domain/describe';
import type { Animal } from '@/domain/types';
import { focusRing, theme } from '@/theme';

import { AnimalAvatar } from './AnimalAvatar';

interface SelectedAnimalBarProps {
  animal: Animal;
  /** Second line, e.g. "Dog · open case C-0142" (a node for mixed styling; then pass `subtitleLabel`). */
  subtitle: ReactNode;
  /** Spoken form of a node subtitle. */
  subtitleLabel?: string;
  onChange?: () => void;
  /** Opens the animal profile when the name is tapped. */
  onOpenProfile?: () => void;
  testID?: string;
}

/** Context card with the animal being worked on and "Change" (screens 9, 10, 11). */
export function SelectedAnimalBar({ animal, subtitle, subtitleLabel, onChange, onOpenProfile, testID }: SelectedAnimalBarProps) {
  const spoken = subtitleLabel ?? (typeof subtitle === 'string' ? subtitle : '');
  const identity = (
    <>
      <AnimalAvatar animal={animal} />
      <View style={styles.text}>
        <AppText variant="titleS">
          {animalTitle(animal)}
        </AppText>
        {typeof subtitle === 'string' ? (
          <AppText variant="bodyS" tone="muted">
            {subtitle}
          </AppText>
        ) : (
          subtitle
        )}
      </View>
    </>
  );
  return (
    <View style={styles.bar} testID={testID}>
      {onOpenProfile ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${animalTitle(animal)}. ${spoken}`}
          accessibilityHint="Opens the animal profile"
          onPress={onOpenProfile}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.identity, focused && focusRing]}
        >
          {identity}
        </Pressable>
      ) : (
        <View style={styles.identity} accessible accessibilityLabel={`${animalTitle(animal)}. ${spoken}`}>
          {identity}
        </View>
      )}
      {onChange ? <LinkButton label="Change" accessibilityLabel="Change animal" onPress={onChange} testID={testID ? `${testID}-change` : undefined} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
    paddingLeft: theme.spacing.s3,
    paddingRight: theme.spacing.s2,
    paddingVertical: theme.spacing.s3,
    borderRadius: theme.radius.xl,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
  },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3, borderRadius: theme.radius.md },
  text: { flex: 1, minWidth: 0, gap: 2 },
});