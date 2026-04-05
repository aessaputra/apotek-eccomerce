import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AddressList from '@/scenes/profile/AddressList';
import { render, screen, waitFor } from '@/test-utils/renderWithTheme';
import type { Address } from '@/types/address';

const mockPush = jest.fn();
const mockGetAddresses =
  jest.fn<(...args: unknown[]) => Promise<{ data: Address[]; error: null }>>();

const mockAddresses: Address[] = [
  {
    id: 'address-default',
    profile_id: 'user-1',
    receiver_name: 'Alamat Utama',
    phone_number: '081111111111',
    street_address: 'Jl. Merdeka No. 1',
    city: 'Jakarta',
    city_id: null,
    area_id: null,
    country_code: 'ID',
    province: 'DKI Jakarta',
    province_id: null,
    latitude: null,
    longitude: null,
    postal_code: '10110',
    is_default: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'address-other',
    profile_id: 'user-1',
    receiver_name: 'Alamat Kedua',
    phone_number: '082222222222',
    street_address: 'Jl. Sudirman No. 2',
    city: 'Bandung',
    city_id: null,
    area_id: null,
    country_code: 'ID',
    province: 'Jawa Barat',
    province_id: null,
    latitude: null,
    longitude: null,
    postal_code: '40111',
    is_default: false,
    created_at: '2025-01-02T00:00:00Z',
  },
];

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    callback();
  },
}));

jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual(
    'react-native-safe-area-context',
  ) as typeof import('react-native-safe-area-context');

  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('@/slices', () => ({
  useAppSlice: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/services/address.service', () => ({
  getAddresses: (...args: unknown[]) => mockGetAddresses(...args),
  deleteAddress: jest.fn(async () => ({ error: null })),
  setDefaultAddress: jest.fn(async () => ({ error: null })),
}));

jest.mock('@/components/elements/AppAlertDialog', () => () => null);

jest.mock('react-native-gesture-handler', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  const Swipeable = React.forwardRef(
    (
      {
        children,
        renderRightActions,
      }: {
        children: ReactNode;
        renderRightActions?: () => ReactNode;
      },
      ref: React.ForwardedRef<{ close: () => void }>,
    ) => {
      React.useImperativeHandle(ref, () => ({ close: jest.fn() }), []);

      return (
        <>
          <View>{children}</View>
          {renderRightActions ? <View>{renderRightActions()}</View> : null}
        </>
      );
    },
  );

  Swipeable.displayName = 'MockSwipeable';

  return {
    __esModule: true,
    Swipeable,
  };
});

jest.mock('@/components/icons', () => ({
  __esModule: true,
  StarIcon: () => null,
  EditIcon: () => null,
  DeleteIcon: () => null,
}));

describe('<AddressList />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAddresses.mockResolvedValue({ data: mockAddresses, error: null });
  });

  it('renders the real swipeable row and address card path without section labels', async () => {
    render(<AddressList />);

    await waitFor(() => {
      expect(screen.getByText('Alamat Utama')).not.toBeNull();
      expect(screen.getByText('Alamat Kedua')).not.toBeNull();
      expect(screen.getByText('Jl. Merdeka No. 1, Jakarta, DKI Jakarta, 10110')).not.toBeNull();
      expect(screen.getByText('Jl. Sudirman No. 2, Bandung, Jawa Barat, 40111')).not.toBeNull();
    });

    expect(screen.queryByText('Alamat Default')).toBeNull();
    expect(screen.queryByText('Alamat Lainnya')).toBeNull();
    expect(screen.queryByText('Default')).toBeNull();
    expect(screen.getAllByText('Utama')).toHaveLength(1);
    expect(screen.getByLabelText('Alamat Alamat Utama')).not.toBeNull();
    expect(screen.getByLabelText('Alamat Alamat Kedua')).not.toBeNull();
    expect(screen.getAllByLabelText('Edit alamat')).toHaveLength(2);
    expect(screen.getAllByLabelText('Hapus alamat')).toHaveLength(2);
    expect(screen.getAllByLabelText('Jadikan alamat utama')).toHaveLength(1);
  });
});
