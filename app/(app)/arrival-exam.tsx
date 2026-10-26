import { ArrivalExamScreen } from '@/features/arrivals/ArrivalExamScreen';
import { useIsScreenFocused } from '@/navigation/useIsScreenFocused';

/** Wireframe 03. Hidden from the tab bar; reached from New Arrival > Continue to exam. */
export default function ArrivalExamRoute() {
  const focused = useIsScreenFocused();
  return focused ? <ArrivalExamScreen /> : null;
}
