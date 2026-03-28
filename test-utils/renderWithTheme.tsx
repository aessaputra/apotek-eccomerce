import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import tamaguiConfig from '../tamagui.config';

/**
 * Wrapper untuk render komponen yang pakai Tamagui (Button, GradientButton, dll).
 * Tanpa TamaguiProvider, komponen Tamagui akan error saat render di test.
 */
type ThemeName = 'brand' | 'brand_dark';

function AllThemesProvider({
  children,
  defaultTheme = 'brand',
}: {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
}) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme={defaultTheme}>
        {children}
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  defaultTheme?: ThemeName;
};

function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const { defaultTheme = 'brand', ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllThemesProvider defaultTheme={defaultTheme}>{children}</AllThemesProvider>
    ),
    ...renderOptions,
  });
}

function renderWithDarkTheme(
  ui: ReactElement,
  options?: Omit<CustomRenderOptions, 'defaultTheme'>,
) {
  return customRender(ui, { ...options, defaultTheme: 'brand_dark' });
}

export * from '@testing-library/react-native';
export { customRender as render };
export { renderWithDarkTheme };
