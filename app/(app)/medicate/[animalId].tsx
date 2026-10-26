import { useLocalSearchParams } from 'expo-router';

import { MedicationScreen } from '@/features/medication/MedicationScreen';

/** Wireframe 07 for one animal (Animal Profile > Medicate). Back returns to the profile. */
export default function MedicateAnimalRoute() {
  const { animalId } = useLocalSearchParams<{ animalId: string }>();
  return <MedicationScreen animalId={animalId} />;
}
