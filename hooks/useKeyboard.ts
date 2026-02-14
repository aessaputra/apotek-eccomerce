import { useState, useEffect } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

/**
 * Custom hook to track keyboard visibility and height.
 *
 * Fixes initialization issue where keyboard state is not synced on mount.
 * Checks initial keyboard state using Keyboard.isVisible() and Keyboard.metrics()
 * to ensure hook always has correct state, even if keyboard is already open when component mounts.
 *
 * **Implementation Details:**
 * - Registers listeners FIRST to catch events during initialization
 * - Checks initial state AFTER listeners are registered
 * - Includes delayed check for race conditions where keyboard opens very quickly
 * - Handles errors gracefully with try-catch
 *
 * @see https://reactnative.dev/docs/keyboard#isvisible
 * @see https://reactnative.dev/docs/keyboard#metrics
 * @see https://reactnative.dev/docs/keyboard#addlistener
 *
 * @returns Object with `keyboardVisible` (boolean) and `keyboardHeight` (number)
 */
export function useKeyboard() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardScreenY, setKeyboardScreenY] = useState(0);

  useEffect(() => {
    // Check initial keyboard state on mount
    // This fixes the issue where keyboard is already open when component mounts
    // and listeners don't fire because the event already occurred
    const checkInitialState = () => {
      try {
        if (Keyboard.isVisible()) {
          const metrics = Keyboard.metrics();
          if (metrics && typeof metrics.height === 'number') {
            setKeyboardVisible(true);
            setKeyboardHeight(metrics.height);
            setKeyboardScreenY(metrics.screenY ?? 0);
          }
        } else {
          // Ensure state is reset if keyboard is not visible
          setKeyboardVisible(false);
          setKeyboardHeight(0);
          setKeyboardScreenY(0);
        }
      } catch (error) {
        // Gracefully handle any errors from Keyboard API
        // Log in development, silent in production
        if (__DEV__) {
          console.warn('useKeyboard: Error checking initial keyboard state', error);
        }
      }
    };

    // Register listeners FIRST to catch events that occur during initialization
    // This ensures we don't miss keyboard events that happen between mount and listener registration
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardScreenY(e.endCoordinates.screenY);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      setKeyboardScreenY(0);
    });

    // Check initial state AFTER listeners are registered
    // This ensures we have correct state even if keyboard was already open
    checkInitialState();

    // Delayed check to handle race conditions where keyboard opens very quickly
    // between component mount and listener registration
    // Only needed as a safety net for edge cases
    const timeoutId = setTimeout(() => {
      try {
        // Re-check initial state to catch any race conditions
        checkInitialState();
      } catch (error) {
        if (__DEV__) {
          console.warn('useKeyboard: Error in delayed keyboard state check', error);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []); // Empty deps: only run on mount/unmount

  return { keyboardVisible, keyboardHeight, keyboardScreenY };
}
