import { forwardRef, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable as NativePressable,
  type GestureResponderEvent,
  type NativeSyntheticEvent,
  type PressableProps as NativePressableProps,
  type StyleProp,
  type TargetedEvent,
  type View,
  type ViewStyle,
} from 'react-native';

export interface PressableState {
  pressed: boolean;
  /** Keyboard (focus-visible) focus only — never set by a tap or mouse click. */
  focused?: boolean;
}

export interface PressableProps extends Omit<NativePressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle> | ((state: PressableState) => StyleProp<ViewStyle>);
  children?: ReactNode | ((state: PressableState) => ReactNode);
}

/** True when the browser would show a focus ring for this element (keyboard, not pointer). */
function isFocusVisible(event: NativeSyntheticEvent<TargetedEvent>): boolean {
  if (Platform.OS !== 'web') return true;
  const target = (event.nativeEvent as unknown as { target?: { matches?: (selector: string) => boolean } }).target;
  try {
    return target?.matches?.(':focus-visible') ?? true;
  } catch {
    return true;
  }
}

/**
 * Pressable whose `focused` state means *visible* focus: the C1/C2 focus ring appears when a control is reached
 * with a keyboard (Tab, switch access, hardware keyboard), not after a tap or mouse click. Use it instead of
 * React Native's Pressable for every interactive control.
 */
export const Pressable = forwardRef<View, PressableProps>(function Pressable({ style, children, onFocus, onBlur, ...rest }, ref) {
  const [focusVisible, setFocusVisible] = useState(false);
  const withFocus = (state: { pressed: boolean }): PressableState => ({ pressed: state.pressed, focused: focusVisible });
  const role = rest.role ?? rest.accessibilityRole;
  // React Native Web only treats Space as a press for role="button"; ARIA also expects Space to toggle
  // switches and checkboxes and to select radios.
  const spaceToggles = Platform.OS === 'web' && (role === 'switch' || role === 'checkbox' || role === 'radio');
  const keyHandler = spaceToggles
    ? ({
        onKeyDown: (event: { key: string; preventDefault: () => void }) => {
          if (event.key !== ' ' && event.key !== 'Spacebar') return;
          event.preventDefault();
          if (!rest.disabled) rest.onPress?.(event as unknown as GestureResponderEvent);
        },
      } as unknown as Partial<NativePressableProps>)
    : null;
  return (
    <NativePressable
      {...rest}
      {...keyHandler}
      ref={ref}
      onFocus={(event) => {
        setFocusVisible(isFocusVisible(event));
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocusVisible(false);
        onBlur?.(event);
      }}
      style={typeof style === 'function' ? (state) => style(withFocus(state)) : style}
    >
      {typeof children === 'function' ? (state) => children(withFocus(state)) : children}
    </NativePressable>
  );
});
