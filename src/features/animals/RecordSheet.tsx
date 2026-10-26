import { StyleSheet, View } from 'react-native';

import { AppText, BottomSheet, ErrorView, InfoRows, SkeletonList, StatusChip } from '@/components';
import { describeInspection, isInspectionAbnormal, observationRef } from '@/domain/describe';
import { EXAM_SYSTEMS, EXAM_SYSTEM_LABELS, type ArrivalExamRecord, type TimelineEntry } from '@/domain/types';
import { EvidenceStrip } from '@/features/evidence/EvidenceStrip';
import { theme } from '@/theme';
import { formatDateTime } from '@/utils/dates';

import { useRecordDetail } from './hooks';

interface RecordSheetProps {
  entry: TimelineEntry | null;
  /** "KC2-2 Yang Yang", for evidence captions. */
  animalTitle: string;
  onClose: () => void;
}

const TITLES: Record<TimelineEntry['kind'], string> = {
  inspection: 'Daily inspection',
  observation: 'Observation',
  medication: 'Medication',
  exam: 'Arrival exam',
  case: 'Case event',
};

/** Source record behind a timeline entry or summary citation (FE-014: tapping a citation opens it). */
export function RecordSheet({ entry, animalTitle, onClose }: RecordSheetProps) {
  const detail = useRecordDetail(entry);
  const title = entry ? `${TITLES[entry.kind]}${entry.session ? ` · ${entry.session}` : ''}` : 'Record';
  return (
    <BottomSheet visible={entry !== null} title={title} onClose={onClose} scroll testID="record-sheet">
      {!entry ? null : detail.isPending ? (
        <SkeletonList label="Loading record" rows={2} />
      ) : detail.isError || !detail.data ? (
        <ErrorView message="Check your connection and try again." onRetry={() => void detail.refetch()} />
      ) : (
        <View style={styles.body}>
          <AppText variant="bodyS" tone="muted">{`${formatDateTime(entry.at)} · ${entry.by}`}</AppText>
          {detail.data.kind === 'inspection' ? (
            <>
              <StatusChip
                label={isInspectionAbnormal(detail.data.record) ? 'Abnormal findings' : 'All normal'}
                tone={isInspectionAbnormal(detail.data.record) ? 'abnormal' : 'success'}
              />
              <InfoRows
                rows={[
                  { label: 'Mentation', value: detail.data.record.mentation },
                  { label: 'Food', value: detail.data.record.food },
                  { label: 'Stool', value: detail.data.record.stool },
                  { label: 'Urine', value: detail.data.record.urine },
                ]}
              />
              <AppText>{describeInspection(detail.data.record)}</AppText>
            </>
          ) : detail.data.kind === 'observation' ? (
            <>
              <AppText variant="body">{`“${detail.data.record.text}”`}</AppText>
              <EvidenceStrip
                media={detail.data.record.media}
                caption={{
                  title: `${detail.data.record.ai?.extraction.signs[0]?.label ?? 'Observation'} · ${animalTitle}`,
                  meta: `${formatDateTime(entry.at)} · by ${entry.by} · Observation ${observationRef(detail.data.record.id)}`,
                }}
              />
              {detail.data.record.ai?.extraction.signs.length ? (
                <AppText variant="bodyS" tone="muted">{`Signs: ${detail.data.record.ai.extraction.signs.map((s) => s.label).join(', ')}`}</AppText>
              ) : null}
              {detail.data.record.routing ? (
                <AppText variant="bodyS" tone="muted">
                  {`Routed by ${detail.data.record.routing.confirmedBy}${detail.data.record.routing.caseId ? ` to case ${detail.data.record.routing.caseId}` : ' to the timeline'}`}
                </AppText>
              ) : (
                <StatusChip label="Awaiting confirmation" tone="warning" />
              )}
            </>
          ) : detail.data.kind === 'medication' ? (
            <InfoRows
              rows={[
                { label: 'Item', value: detail.data.schedule ? `${detail.data.schedule.item} ${detail.data.schedule.dose}` : 'Medication' },
                { label: 'Given', value: formatDateTime(detail.data.record.administeredAt) },
                { label: 'Officer', value: detail.data.record.by },
                { label: 'Remarks', value: detail.data.record.remarks || '—' },
              ]}
            />
          ) : detail.data.kind === 'exam' ? (
            <ExamDetail record={detail.data.record} vet={detail.data.vet} />
          ) : (
            <AppText>{entry.text}</AppText>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

function ExamDetail({ record, vet }: { record: ArrivalExamRecord; vet: string }) {
  return (
    <>
      <InfoRows
        rows={[
          { label: 'Examining vet', value: vet },
          { label: 'Weight', value: `${record.weightKg} kg` },
          { label: 'Mentation', value: record.mentation },
        ]}
      />
      {EXAM_SYSTEMS.map((system) => {
        const finding = record.findings[system];
        return (
          <AppText key={system} variant="bodyS" tone={finding.abnormal ? 'abnormal' : 'muted'}>
            {`${EXAM_SYSTEM_LABELS[system]}: ${finding.abnormal ? `Abnormal · ${finding.note}` : 'Normal'}`}
          </AppText>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: theme.spacing.s3, paddingBottom: theme.spacing.s3 },
});