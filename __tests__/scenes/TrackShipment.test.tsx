import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Linking, ScrollView } from 'react-native';
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

const makeOrderDetailReturn = (overrides = {}) => ({
  order: mockOrder,
  status: 'success',
  isLoading: false,
  isRefreshing: false,
  error: null,
  refresh: jest.fn(),
  ...overrides,
});

const makeTrackingReturn = (overrides = {}) => ({
  tracking: {
    id: 'tracking-1',
    waybill_id: 'JNE12345',
    status: 'dropping_off',
    courier: { company: 'jne' },
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
  ...overrides,
});

function collectTextNodes(
  node: unknown,
  texts: string[] = [],
  visited = new Set<unknown>(),
): string[] {
  if (node == null || typeof node === 'boolean') {
    return texts;
  }

  if (typeof node === 'string' || typeof node === 'number') {
    texts.push(String(node));
    return texts;
  }

  if (typeof node !== 'object' || visited.has(node)) {
    return texts;
  }

  visited.add(node);

  const candidate = node as { children?: unknown[] };
  if (Array.isArray(candidate.children)) {
    candidate.children.forEach(child => collectTextNodes(child, texts, visited));
  }

  return texts;
}

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
    mockUseOrderDetail.mockReturnValue(
      makeOrderDetailReturn({
        order: {
          ...mockOrder,
          updated_at: '2024-01-16T10:30:00Z',
        },
      }),
    );
    mockUseOrderTracking.mockReturnValue(
      makeTrackingReturn({
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
              note: 'Paket sudah sampai di hub tujuan',
              status: 'in_transit',
              updated_at: '2026-04-13T08:00:00+07:00',
            },
            {
              note: 'Paket sedang diantar ke alamat tujuan',
              status: 'dropping_off',
              updated_at: '2026-04-14T08:00:00+07:00',
            },
          ],
          link: 'https://tracking.example/JNE12345',
        },
      }),
    );

    const { UNSAFE_root } = render(<TrackShipment />);
    const texts = collectTextNodes(UNSAFE_root);

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
    expect(screen.getByText('Paket sudah sampai di hub tujuan')).not.toBeNull();
    expect(screen.getByText('Paket sedang diantar ke alamat tujuan')).not.toBeNull();
    expect(screen.getByText(/14 Apr 2026/)).not.toBeNull();
    expect(texts.indexOf('Paket sudah sampai di hub tujuan')).toBeLessThan(
      texts.indexOf('Paket sedang diantar ke alamat tujuan'),
    );
  });

  test('renders fallback timeline when tracking history is empty', () => {
    mockUseOrderDetail.mockReturnValue(makeOrderDetailReturn());
    mockUseOrderTracking.mockReturnValue(
      makeTrackingReturn({
        tracking: {
          id: 'tracking-empty',
          waybill_id: 'JNE12345',
          status: 'dropping_off',
          courier: { company: 'jne' },
          history: [],
          link: null,
        },
      }),
    );

    render(<TrackShipment />);

    expect(screen.getByText('Status pengiriman belum memiliki riwayat detail.')).not.toBeNull();
    expect(screen.getAllByText('Sedang Dikirim').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/16 Jan 2024/).length).toBeGreaterThan(0);
  });

  test('renders waiting state when waybill is unavailable', () => {
    mockUseOrderDetail.mockReturnValue(
      makeOrderDetailReturn({
        order: {
          ...mockOrder,
          waybill_number: null,
        },
      }),
    );
    mockUseOrderTracking.mockReturnValue(makeTrackingReturn({ tracking: null, status: 'idle' }));

    render(<TrackShipment />);

    expect(screen.getByText('Menunggu Nomor Resi')).not.toBeNull();
    expect(mockUseOrderTracking).toHaveBeenCalledWith('test-order-id', false);
  });

  test('renders loading and error states from tracking hooks', () => {
    mockUseOrderDetail.mockReturnValue(makeOrderDetailReturn({ isLoading: true }));
    mockUseOrderTracking.mockReturnValue(makeTrackingReturn({ status: 'idle', tracking: null }));

    const { rerender } = render(<TrackShipment />);

    expect(screen.getByText('Memuat data tracking...')).not.toBeNull();

    mockUseOrderDetail.mockReturnValue(makeOrderDetailReturn({ isLoading: false }));
    mockUseOrderTracking.mockReturnValue(
      makeTrackingReturn({ status: 'error', error: 'Tracking belum bisa dimuat' }),
    );

    rerender(<TrackShipment />);

    expect(screen.getByText('Tracking Belum Bisa Dimuat')).not.toBeNull();
    expect(screen.getByText('Tracking belum bisa dimuat')).not.toBeNull();
  });

  test('retries order loading when the main order fetch fails', () => {
    const refreshOrder = jest.fn(() => Promise.resolve());

    mockUseOrderDetail.mockReturnValue(
      makeOrderDetailReturn({
        status: 'error',
        error: 'Pesanan gagal dimuat',
        refresh: refreshOrder,
      }),
    );
    mockUseOrderTracking.mockReturnValue(makeTrackingReturn({ tracking: null, status: 'idle' }));

    render(<TrackShipment />);

    expect(screen.getByText('Gagal Memuat Tracking')).not.toBeNull();
    expect(screen.getByText('Pesanan gagal dimuat')).not.toBeNull();

    fireEvent.press(screen.getByText('Coba Lagi'));

    expect(refreshOrder).toHaveBeenCalled();
  });

  test('refreshes both order and tracking data when tracking is available', async () => {
    const refreshOrder = jest.fn(() => Promise.resolve());
    const refreshTracking = jest.fn(() => Promise.resolve());

    mockUseOrderDetail.mockReturnValue(
      makeOrderDetailReturn({ refresh: refreshOrder, isRefreshing: true }),
    );
    mockUseOrderTracking.mockReturnValue(
      makeTrackingReturn({ refresh: refreshTracking, isRefreshing: true }),
    );

    const { UNSAFE_getByType } = render(<TrackShipment />);

    expect(UNSAFE_getByType(ScrollView).props.refreshControl.props.refreshing).toBe(true);

    await UNSAFE_getByType(ScrollView).props.refreshControl.props.onRefresh();

    expect(refreshOrder).toHaveBeenCalled();
    expect(refreshTracking).toHaveBeenCalled();
  });

  test('does not render optional tracking fields when missing', () => {
    mockUseOrderDetail.mockReturnValue(makeOrderDetailReturn());
    mockUseOrderTracking.mockReturnValue(
      makeTrackingReturn({
        tracking: {
          id: 'tracking-missing-fields',
          waybill_id: 'JNE12345',
          status: 'dropping_off',
          courier: { company: 'jne' },
          history: [],
          link: null,
        },
      }),
    );

    render(<TrackShipment />);

    expect(screen.queryByText('DRIVER')).toBeNull();
    expect(screen.queryByText('KONTAK DRIVER')).toBeNull();
    expect(screen.queryByText('Lihat Tracking Kurir Eksternal')).toBeNull();
  });

  test('opens courier tracking link when url is safe', () => {
    mockUseOrderDetail.mockReturnValue(makeOrderDetailReturn());
    mockUseOrderTracking.mockReturnValue(
      makeTrackingReturn({
        tracking: {
          id: 'tracking-1',
          waybill_id: 'JNE12345',
          status: 'dropping_off',
          courier: { company: 'jne' },
          history: [],
          link: 'https://tracking.example/JNE12345',
        },
      }),
    );

    render(<TrackShipment />);

    fireEvent.press(screen.getByText('Lihat Tracking Kurir Eksternal'));
    expect(mockOpenURL).toHaveBeenCalledWith('https://tracking.example/JNE12345');
  });
});
