import { useLayoutEffect } from 'react';

interface HeaderVisibilityNavigation {
  setOptions: (options: { headerShown: boolean }) => void;
}

export function useCartHeaderVisibility(
  navigation: HeaderVisibilityNavigation,
  showInitialLoadingOverlay: boolean,
) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: !showInitialLoadingOverlay,
    });

    return () => {
      navigation.setOptions({
        headerShown: true,
      });
    };
  }, [navigation, showInitialLoadingOverlay]);
}
