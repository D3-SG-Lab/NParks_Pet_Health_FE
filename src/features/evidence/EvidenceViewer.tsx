import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Icon, MediaThumb, formatDuration, Pressable } from '@/components';
import type { MediaItem } from '@/domain/types';
import { theme } from '@/theme';

export interface EvidenceCaption {
  /** "Soft stool · KC2-2 Yang Yang". */
  title: string;
  /** "20/10/2026 16:20 · by J. Tan · Observation O-3381". */
  meta: string;
}

interface EvidenceViewerProps {
  media: readonly MediaItem[];
  /** Index of the item to show, or null when closed. */
  index: number | null;
  onChangeIndex: (next: number | null) => void;
  caption: EvidenceCaption;
}

/**
 * Screen 8: Evidence viewer (FE-024). Dark full-screen viewer with zoom, previous/next and a
 * thumbnail strip. MOCK: media are placeholders. OUTSTANDING: real image zoom (pinch) and video
 * playback through short-lived read URLs (BE-013). Nothing is ever saved to the device gallery.
 */
export function EvidenceViewer({ media, index, onChangeIndex, caption }: EvidenceViewerProps) {
  const [zoomed, setZoomed] = useState(false);
  const item = index === null ? undefined : media[index];
  const total = media.length;
  const go = (next: number) => {
    setZoomed(false);
    onChangeIndex(next);
  };
  const close = () => {
    setZoomed(false);
    onChangeIndex(null);
  };

  return (
    <Modal visible={item !== undefined} animationType="fade" onRequestClose={close} presentationStyle="fullScreen">
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']} testID="evidence-viewer">
          {item && index !== null ? (
            <>
              <View style={styles.top}>
                <Pressable accessibilityRole="button" accessibilityLabel="Close evidence viewer" onPress={close} style={[styles.iconButton, styles.round]} hitSlop={theme.spacing.s2}>
                  <Icon name="close" color={theme.colors.inverse} />
                </Pressable>
                <AppText variant="titleS" tone="inverse" style={styles.counter} accessibilityRole="header">{`${index + 1} of ${total}`}</AppText>
                <View style={styles.iconButton} />
              </View>

              <View style={styles.stageWrap}>
                <Pressable
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`${item.kind === 'video' ? 'Video' : 'Photo'} ${index + 1} of ${total}. ${caption.title}. Double tap to ${zoomed ? 'zoom out' : 'zoom in'}`}
                  onPress={() => setZoomed((z) => !z)}
                  style={styles.stage}
                  testID="evidence-stage"
                >
                  <View style={[styles.placeholder, zoomed && styles.zoomed]}>
                    <Icon name={item.kind === 'video' ? 'play' : 'image-outline'} size="lg" color={theme.colors.onInkMuted} />
                    <AppText variant="bodyS" style={styles.dim}>
                      {item.kind === 'video'
                        ? `Video${item.durationSec ? ` · ${formatDuration(item.durationSec)}` : ''} · tap to play`
                        : `Photo · ${zoomed ? 'tap to zoom out' : 'tap to zoom'}`}
                    </AppText>
                  </View>
                </Pressable>
                {index > 0 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Previous" onPress={() => go(index - 1)} style={[styles.nav, styles.navLeft]} testID="evidence-prev">
                    <Icon name="chevron-back" color={theme.colors.inverse} />
                  </Pressable>
                ) : null}
                {index < total - 1 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Next" onPress={() => go(index + 1)} style={[styles.nav, styles.navRight]} testID="evidence-next">
                    <Icon name="chevron-forward" color={theme.colors.inverse} />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.bottom}>
                <AppText variant="titleS" tone="inverse">
                  {caption.title}
                </AppText>
                <AppText variant="bodyS" style={styles.dim}>
                  {caption.meta}
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                  {media.map((m, i) => (
                    <MediaThumb
                      key={m.id}
                      kind={m.kind}
                      size="sm"
                      dark
                      selected={i === index}
                      onPress={() => go(i)}
                      accessibilityLabel={`Show ${m.kind} ${i + 1} of ${total}`}
                    />
                  ))}
                </ScrollView>
              </View>
              <View style={styles.footer}>
                <Icon name="lock-closed-outline" size="xs" color={theme.colors.onInkMuted} />
                <AppText variant="caption" style={styles.dim}>
                  View only · secure link expires in 10 min · not saved to device
                </AppText>
              </View>
            </>
          ) : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ink },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.s4, minHeight: theme.control.appBar },
  iconButton: { width: theme.control.minTouch, height: theme.control.minTouch, alignItems: 'center', justifyContent: 'center' },
  round: { borderRadius: theme.radius.pill, backgroundColor: theme.colors.inkSurface },
  counter: { flex: 1, textAlign: 'center' },
  stageWrap: { flex: 1, justifyContent: 'center' },
  stage: { flex: 1, maxHeight: 520, marginVertical: theme.spacing.s6, backgroundColor: theme.colors.inkSurface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  placeholder: { alignItems: 'center', gap: theme.spacing.s2 },
  zoomed: { transform: [{ scale: 1.8 }] },
  dim: { color: theme.colors.onInkMuted },
  nav: {
    position: 'absolute',
    top: '50%',
    marginTop: -theme.control.minTouch / 2,
    width: theme.control.minTouch,
    height: theme.control.minTouch,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLeft: { left: theme.spacing.s2 },
  navRight: { right: theme.spacing.s2 },
  bottom: { paddingHorizontal: theme.spacing.s4, paddingBottom: theme.spacing.s4, gap: theme.spacing.s1 },
  strip: { gap: theme.spacing.s2, paddingTop: theme.spacing.s2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s1,
    paddingVertical: theme.spacing.s3,
    borderTopWidth: theme.control.borderWidth,
    borderTopColor: theme.colors.inkLine,
    marginHorizontal: theme.spacing.s4,
  },
});