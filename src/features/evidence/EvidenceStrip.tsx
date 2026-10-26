import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MediaThumb } from '@/components';
import type { MediaItem } from '@/domain/types';
import { theme } from '@/theme';

import { EvidenceViewer, type EvidenceCaption } from './EvidenceViewer';

interface EvidenceStripProps {
  media: readonly MediaItem[];
  /** Caption shown in the viewer (title + "date · by · source"). */
  caption: EvidenceCaption;
  /** Tiles shown before collapsing the rest into "+n". */
  maxVisible?: number;
  /**
   * sm/md: fixed-size tiles in a wrapping row. grid: equal tiles filling the width (case evidence,
   * 4 per row on phones).
   */
  size?: 'sm' | 'md' | 'grid';
  /** False inside another button (e.g. a timeline row): thumbnails become plain images. */
  interactive?: boolean;
  testID?: string;
}

/** Evidence thumbnails; tapping one opens the full-screen viewer at that item (FE-024). */
export function EvidenceStrip({ media, caption, maxVisible = 4, size = 'md', interactive = true, testID }: EvidenceStripProps) {
  const [index, setIndex] = useState<number | null>(null);
  if (media.length === 0) return null;
  const overflow = media.length > maxVisible;
  const visible = overflow ? media.slice(0, maxVisible - 1) : media;
  const grid = size === 'grid';
  const tileSize = grid ? 'fill' : size;
  const cell = (key: string, node: ReactNode) =>
    grid ? (
      <View key={key} style={styles.cell}>
        {node}
      </View>
    ) : (
      <View key={key}>{node}</View>
    );
  return (
    <View style={styles.row} testID={testID}>
      {visible.map((item, i) =>
        cell(
          item.id,
          <MediaThumb
            kind={item.kind}
            durationSec={item.durationSec}
            size={tileSize}
            onPress={interactive ? () => setIndex(i) : undefined}
            accessibilityLabel={interactive ? `Open ${item.kind} ${i + 1} of ${media.length}` : `${item.kind} ${i + 1} of ${media.length}`}
            testID={testID ? `${testID}-${i}` : undefined}
          />,
        ),
      )}
      {overflow
        ? cell(
            'more',
            <MediaThumb
              kind="photo"
              moreCount={media.length - visible.length}
              size={tileSize}
              onPress={interactive ? () => setIndex(visible.length) : undefined}
              accessibilityLabel={`${media.length - visible.length} more`}
            />,
          )
        : null}
      {interactive ? <EvidenceViewer media={media} index={index} onChangeIndex={setIndex} caption={caption} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s2 },
  // Four equal tiles per row (minus the gaps), shrinking with the screen width.
  cell: { width: '23%', flexGrow: 1, maxWidth: 120 },
});