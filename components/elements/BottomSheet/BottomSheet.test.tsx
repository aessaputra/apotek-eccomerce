import { test, expect } from '@jest/globals';
import { render, screen } from '../../../test-utils/renderWithTheme';
import BottomSheet from './BottomSheet';
import { Text } from 'tamagui';

jest.mock('@gorhom/bottom-sheet', () => {
  const { View, ScrollView } = require('react-native');
  const { forwardRef } = require('react');
  return {
    __esModule: true,
    default: forwardRef(({ children }: { children: React.ReactNode }, _ref: unknown) => (
      <View>{children}</View>
    )),
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
