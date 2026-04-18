import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import TrackShipment from '@/scenes/orders/TrackShipment';

const mockUseOrderDetail = jest.fn();
const mockUseOrderTracking = jest.fn();
const mockOpenURL = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: () => ({ orderId: 'test-order-id' }),
}));

jest.mock('@/hooks', () => ({
  useOrderDetail: (...args: unknown[]) => mockUseOrderDetail(...args),
  useOrderTracking: (...args: unknown[]) => mockUseOrderTracking(...args),
}));

const mockOrder = {
  id: 'test-order-id',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-16T10:30:00Z',
  status: 'shipped',
  payment_status: 'settlement',
  courier_code: 'jne',
  courier_service: 'REG',
  waybill_number: 'JNE12345',
};

describe('<TrackShipment />', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockImplementation((...args: unknown[]) => {
      mockOpenURL(...args);
      return Promise.resolve();
    });

    mockUseOrderDetail.mockReset();
    mockUseOrderTracking.mockReset();
    mockOpenURL.mockReset();
  });

  test('renders tracking timeline data', () => {
    mockUseOrderDetail.mockReturnValue({
      order: mockOrder,
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseOrderTracking.mockReturnValue({
      tracking: {
        id: 'tracking-1',
        waybill_id: 'JNE12345',
        status: 'dropping_off',
        courier: {
          company: 'jne',
          driver_name: 'Budi',
          driver_phone: '08123456789',
        },
        history: [
          {
            note: 'Paket sedang diantar ke alamat tujuan',
            status: 'dropping_off',
            updated_at: '2026-04-14T08:00:00+07:00',
          },
        ],
        link: 'https://tracking.example/JNE12345',
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<TrackShipment />);

    expect(screen.getByText('Perjalanan Paket Anda')).not.toBeNull();
    expect(
      screen.getByText(
        'Lihat status terbaru, resi, dan riwayat perpindahan paket Anda di satu layar.',
      ),
    ).not.toBeNull();
    expect(screen.getByText('Riwayat Pengiriman')).not.toBeNull();
    expect(screen.getByText('NOMOR RESI')).not.toBeNull();
    expect(screen.getByText('JNE12345')).not.toBeNull();
    expect(screen.getByText('DRIVER')).not.toBeNull();
    expect(screen.getByText('Budi')).not.toBeNull();
    expect(screen.getByText('Paket sedang diantar ke alamat tujuan')).not.toBeNull();
    expect(screen.getAllByText('Sedang Dikirim').length).toBeGreaterThan(0);
  });

  test('renders in_transit tracking with a distinct dalam perjalanan label', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        status: 'in_transit',
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseOrderTracking.mockReturnValue({
      tracking: {
        id: 'tracking-2',
        waybill_id: 'JNE12345',
        status: 'in_transit',
        courier: {
          company: 'jne',
        },
        history: [
          {
            note: 'Paket sedang dalam perjalanan ke kota tujuan',
            status: 'in_transit',
            updated_at: '2026-04-14T10:00:00+07:00',
          },
        ],
        link: 'https://tracking.example/JNE12345',
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<TrackShipment />);

    expect(screen.getAllByText('Dalam Perjalanan').length).toBeGreaterThan(0);
  });

  test('renders waiting state when waybill is unavailable', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        waybill_number: null,
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseOrderTracking.mockReturnValue({
      tracking: null,
      status: 'idle',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<TrackShipment />);

    expect(screen.getByText('Menunggu Nomor Resi')).not.toBeNull();
    expect(mockUseOrderTracking).toHaveBeenCalledWith('test-order-id', false);
  });

  test('opens courier tracking link when url is safe', () => {
    mockUseOrderDetail.mockReturnValue({
      order: mockOrder,
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseOrderTracking.mockReturnValue({
      tracking: {
        id: 'tracking-1',
        waybill_id: 'JNE12345',
        status: 'dropping_off',
        courier: { company: 'jne' },
        history: [],
        link: 'https://tracking.example/JNE12345',
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<TrackShipment />);

    fireEvent.press(screen.getByText('Lihat Tracking Kurir Eksternal'));
    expect(mockOpenURL).toHaveBeenCalledWith('https://tracking.example/JNE12345');
  });
});
