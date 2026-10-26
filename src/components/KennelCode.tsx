import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

interface KennelCodeProps {
  code: string;
  /** Characters to highlight (the search query), e.g. "KC2" in "KC2-2". */
  highlight?: string;
}

/** Kennel code in Plex Mono on a surface-2 tag — the "mono kennel code" of the C6 animal identity. */
export function KennelCode({ code, highlight }: KennelCodeProps) {
  const at = highlight ? code.toLowerCase().indexOf(highlight.trim().toLowerCase()) : -1;
  const length = highlight?.trim().length ?? 0;
  return (
    <View style={styles.tag}>
      {at >= 0 && length > 0 ? (
        <AppText variant="mono" bold>
          {code.slice(0, at)}
          <AppText variant="mono" bold style={styles.match}>
            {code.slice(at, at + length)}
          </AppText>
          {code.slice(at + length)}
        </AppText>
      ) : (
        <AppText variant="mono" bold>
          {code}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'center',
    flexShrink: 0,
    paddingHorizontal: theme.spacing.s1 + 2,
    paddingVertical: 1,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface2,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
  },
  match: { backgroundColor: theme.colors.primaryTint },
});
