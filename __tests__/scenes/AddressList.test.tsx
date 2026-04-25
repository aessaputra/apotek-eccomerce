import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, SectionList } from 'react-native';
import AddressList from '@/scenes/profile/AddressList';
import { act, fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import type { Address } from '@/types/address';

const mockPush = jest.fn();
const mockGetAddresses =
  jest.fn<(...args: unknown[]) => Promise<{ data: Address[] | null; error: Error | null }>>();
const mockDeleteAddress = jest.fn<(...args: unknown[]) => Promise<{ error: Error | null }>>();
const mockSetDefaultAddress =
  jest.fn<(...args: unknown[]) => Promise<{ data: Address | null; error: Error | null }>>();

const mockAddresses: Address[] = [
  {
    id: 'address-default',
    profile_id: 'user-1',
    receiver_name: 'Alamat Utama',
    phone_number: '081111111111',
    street_address: 'Jl. Merdeka No. 1',
    address_note: null,
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
    address_note: null,
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
    const React = jest.requireActual('react') as typeof import('react');

    React.useEffect(() => {
      return callback();
    }, [callback]);
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
  deleteAddress: (...args: unknown[]) => mockDeleteAddress(...args),
  setDefaultAddress: (...args: unknown[]) => mockSetDefaultAddress(...args),
}));

jest.mock('@/components/elements/AppAlertDialog', () => {
  const { Pressable, Text, View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  function MockAppAlertDialog({
    open,
    title,
    description,
    cancelText,
    confirmText,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: string;
    cancelText?: string;
    confirmText?: string;
    onConfirm?: () => void | Promise<void>;
  }) {
    if (!open) return null;

    return (
      <View>
        <Text>{title}</Text>
        <Text>{description}</Text>
        {cancelText ? <Text>{cancelText}</Text> : null}
        <Pressable accessibilityLabel={`confirm-${confirmText ?? 'OK'}`} onPress={onConfirm}>
          <Text>{confirmText ?? 'OK'}</Text>
        </Pressable>
      </View>
    );
  }

  return MockAppAlertDialog;
});

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
  MapPinIcon: () => null,
}));

describe('<AddressList />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAddresses.mockResolvedValue({ data: mockAddresses, error: null });
    mockDeleteAddress.mockResolvedValue({ error: null });
    mockSetDefaultAddress.mockResolvedValue({ data: mockAddresses[1] ?? null, error: null });
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

  it('fetches and orders the default address first even when service data is unsorted', async () => {
    mockGetAddresses.mockResolvedValue({
      data: [mockAddresses[1]!, mockAddresses[0]!],
      error: null,
    });

    render(<AddressList />);

    await waitFor(() => {
      expect(mockGetAddresses).toHaveBeenCalledWith('user-1');
    });

    const list = screen.UNSAFE_getByType(SectionList<Address, { data: Address[] }>);
    expect(list.props.sections[0].data.map((address: Address) => address.id)).toEqual([
      'address-default',
      'address-other',
    ]);
  });

  it('shows the empty state and keeps add-address navigation intact', async () => {
    mockGetAddresses.mockResolvedValue({ data: [], error: null });

    render(<AddressList />);

    await waitFor(() => {
      expect(screen.getByText('Belum ada alamat tersimpan')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Tambah alamat pengiriman baru'));

    expect(mockPush).toHaveBeenCalledWith('/profile/address-form');
  });

  it('alerts when fetching addresses fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockGetAddresses.mockResolvedValue({ data: null, error: new Error('offline') });

    render(<AddressList />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal memuat alamat: offline');
    });
  });

  it('refreshes addresses through the list refresh control', async () => {
    render(<AddressList />);

    await waitFor(() => {
      expect(screen.getByText('Alamat Utama')).not.toBeNull();
    });

    const list = screen.UNSAFE_getByType(SectionList<Address, { data: Address[] }>);
    await act(async () => {
      list.props.refreshControl.props.onRefresh();
    });

    await waitFor(() => {
      expect(mockGetAddresses).toHaveBeenCalledTimes(2);
    });
  });

  it('deletes an address after confirmation and reloads the list', async () => {
    render(<AddressList />);

    await waitFor(() => {
      expect(screen.getByText('Alamat Kedua')).not.toBeNull();
    });

    fireEvent.press(screen.getAllByLabelText('Hapus alamat')[1]!);

    expect(screen.getByText('Hapus Alamat')).not.toBeNull();
    expect(screen.getByText('Yakin ingin menghapus alamat Alamat Kedua?')).not.toBeNull();

    fireEvent.press(screen.getByLabelText('confirm-Hapus'));

    await waitFor(() => {
      expect(mockDeleteAddress).toHaveBeenCalledWith('address-other', 'user-1');
      expect(mockGetAddresses).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps the existing delete error alert and skips reload on failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockDeleteAddress.mockResolvedValue({ error: new Error('delete failed') });

    render(<AddressList />);

    await waitFor(() => {
      expect(screen.getByText('Alamat Kedua')).not.toBeNull();
    });

    fireEvent.press(screen.getAllByLabelText('Hapus alamat')[1]!);
    fireEvent.press(screen.getByLabelText('confirm-Hapus'));

    await waitFor(() => {
      expect(mockDeleteAddress).toHaveBeenCalledWith('address-other', 'user-1');
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal menghapus alamat: delete failed');
    });
    expect(mockGetAddresses).toHaveBeenCalledTimes(1);
  });

  it('sets a non-default address as primary and reloads the list', async () => {
    render(<AddressList />);

    await waitFor(() => {
      expect(screen.getByText('Alamat Kedua')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Jadikan alamat utama'));

    await waitFor(() => {
      expect(mockSetDefaultAddress).toHaveBeenCalledWith('address-other', 'user-1');
      expect(mockGetAddresses).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps the existing set-default error alert and skips reload on failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockSetDefaultAddress.mockResolvedValue({ data: null, error: new Error('default failed') });

    render(<AddressList />);

    await waitFor(() => {
      expect(screen.getByText('Alamat Kedua')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Jadikan alamat utama'));

    await waitFor(() => {
      expect(mockSetDefaultAddress).toHaveBeenCalledWith('address-other', 'user-1');
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal mengatur alamat utama: default failed');
    });
    expect(mockGetAddresses).toHaveBeenCalledTimes(1);
  });
});
