import { useLocalSearchParams } from 'expo-router';

import { CaseDetailScreen } from '@/features/cases/CaseDetailScreen';

/** Wireframe 09: Case detail. */
export default function CaseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CaseDetailScreen caseId={id} />;
}
