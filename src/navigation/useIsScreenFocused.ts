import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * True while the current route is the focused one. Tab screens stay mounted when you leave them,
 * so flow screens (New Arrival, Arrival Exam) render nothing when blurred. That unmounts their
 * local form state, so every visit starts from the saved draft instead of stale component state.
 */
export function useIsScreenFocused(): boolean {
  const navigation = useNavigation();
  const [focused, setFocused] = useState(() => navigation.isFocused());

  useEffect(() => {
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  return focused;
}
