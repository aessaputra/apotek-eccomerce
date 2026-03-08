import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../tamagui.config';

/**
 * Wrapper untuk render komponen yang pakai Tamagui (Button, GradientButton, dll).
 * Tanpa TamaguiProvider, komponen Tamagui akan error saat render di test.
 */
function AllThemesProvider({ children }: { children: React.ReactNode }) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="brand">
      {children}
    </TamaguiProvider>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: ({ children }) => <AllThemesProvider>{children}</AllThemesProvider>,
    ...options,
  });
}

export * from '@testing-library/react-native';
export { customRender as render };
