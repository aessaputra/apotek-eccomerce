import { test, expect } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import BottomSheet from '@/components/elements/BottomSheet';
import { Text } from 'tamagui';

jest.mock('@gorhom/bottom-sheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, ScrollView } = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { forwardRef } = require('react');
  const MockBottomSheet = forwardRef(
    ({ children }: { children: React.ReactNode }, _ref: unknown) => <View>{children}</View>,
  );
  MockBottomSheet.displayName = 'MockBottomSheet';
  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetBackdrop: View,
    BottomSheetScrollView: ScrollView,
  };
});

jest.mock('@/utils/deviceInfo', () => ({
  isWeb: false,
  isIos: false,
  isAndroid: true,
  windowWidth: 375,
  windowHeight: 812,
}));

describe('<BottomSheet />', () => {
  test('renders children when open on native', async () => {
    render(
      <BottomSheet isOpen snapPoints={['50%']}>
        <Text>Sheet Content</Text>
      </BottomSheet>,
    );
    expect(screen.getByText('Sheet Content')).not.toBeNull();
  });

  test('renders children when initialOpen', async () => {
    render(
      <BottomSheet isOpen initialOpen snapPoints={['50%']}>
        <Text>Initial Content</Text>
      </BottomSheet>,
    );
    expect(screen.getByText('Initial Content')).not.toBeNull();
  });
});
