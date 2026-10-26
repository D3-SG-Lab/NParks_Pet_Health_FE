import { useLocalSearchParams } from 'expo-router';

import { AnimalProfileScreen } from '@/features/animals/AnimalProfileScreen';

/** Wireframe 08: Animal Profile. */
export default function AnimalRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AnimalProfileScreen animalId={id} />;
}
