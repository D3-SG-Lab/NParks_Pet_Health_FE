import { NewArrivalScreen } from '@/features/arrivals/NewArrivalScreen';
import { useIsScreenFocused } from '@/navigation/useIsScreenFocused';

/** Wireframe 02. Hidden from the tab bar; reached from Operations > New Arrival. */
export default function NewArrivalRoute() {
  const focused = useIsScreenFocused();
  return focused ? <NewArrivalScreen /> : null;
}
