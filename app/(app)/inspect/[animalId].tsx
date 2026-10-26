import { useLocalSearchParams } from 'expo-router';

import { DailyInspectionScreen } from '@/features/inspections/DailyInspectionScreen';

/** Wireframe 04 for one animal (Animal Profile > Inspect). Back returns to the profile. */
export default function InspectAnimalRoute() {
  const { animalId } = useLocalSearchParams<{ animalId: string }>();
  return <DailyInspectionScreen animalId={animalId} />;
}
