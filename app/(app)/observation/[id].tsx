import { useLocalSearchParams } from 'expo-router';

import { ConfirmObservationScreen } from '@/features/observations/ConfirmObservationScreen';

/** Wireframe 06: Confirm AI result for one observation. */
export default function ObservationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ConfirmObservationScreen observationId={id} />;
}
