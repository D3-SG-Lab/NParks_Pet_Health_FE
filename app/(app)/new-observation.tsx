import { useLocalSearchParams } from 'expo-router';

import { NewObservationScreen } from '@/features/observations/NewObservationScreen';

/** Wireframe 05. Reached from Operations > New Health Observation, or Animal Profile > Observe (?animalId=). */
export default function NewObservationRoute() {
  const { animalId } = useLocalSearchParams<{ animalId?: string }>();
  return <NewObservationScreen animalId={animalId} />;
}
