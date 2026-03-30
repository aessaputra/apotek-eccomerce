import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import AreaPickerSheet from '@/components/AreaPicker/AreaPickerSheet';
import type { BiteshipArea } from '@/types/shipping';
import { useAreaSearch } from '@/hooks/useAreaSearch';
import type { UseAreaSearchReturn } from '@/hooks/useAreaSearch';

jest.mock('tamagui', () => {
  const actual = jest.requireActual('tamagui') as typeof import('tamagui');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  const Sheet = ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <View>{children}</View> : null;

  function SheetHandle() {
    return <View />;
  }

  Sheet.displayName = 'MockSheet';
  SheetHandle.displayName = 'MockSheetHandle';

  Sheet.Overlay = View;
  Sheet.Handle = SheetHandle;
  Sheet.Frame = View;

  return {
    ...actual,
    Sheet,
  };
});

jest.mock('@/hooks/useAreaSearch', () => ({
  __esModule: true,
  useAreaSearch: jest.fn(),
}));

const mockedUseAreaSearch = jest.mocked(useAreaSearch);

const mockArea: BiteshipArea = {
  id: 'area-1',
  name: 'Kelapa Gading',
  administrative_division_level_1_name: 'DKI Jakarta',
  administrative_division_level_2_name: 'Jakarta Utara',
  administrative_division_level_3_name: 'Kelapa Gading',
  postal_code: 14240,
};

function mockHook(overrides: Partial<ReturnType<typeof useAreaSearch>> = {}) {
  const setQueryMock = jest.fn();
  const clearAllMock = jest.fn();
  const searchMock = jest.fn();

  const value: UseAreaSearchReturn = {
    query: '',
    setQuery: (query: string) => setQueryMock(query),
    results: [],
    isLoading: false,
    error: null,
    search: async (input: string) => {
      searchMock(input);
    },
    clearAll: () => clearAllMock(),
    ...overrides,
  };

  mockedUseAreaSearch.mockReturnValue(value);

  return { setQueryMock, clearAllMock };
}

describe('<AreaPickerSheet />', () => {
  test('resets search state when opened', async () => {
    const { setQueryMock, clearAllMock } = mockHook();
    render(
      <AreaPickerSheet
        open
        onOpenChange={jest.fn()}
        onSelect={jest.fn()}
        selectedAreaId="area-1"
      />,
    );

    expect(setQueryMock).toHaveBeenCalledWith('');
    expect(clearAllMock).toHaveBeenCalledTimes(1);
  });

  test('renders empty-state guidance and handles query input in light and dark themes', async () => {
    const setQueryMock = jest.fn();
    const clearAllMock = jest.fn();
    const searchMock = jest.fn();

    mockedUseAreaSearch.mockReturnValue({
      query: '',
      setQuery: (query: string) => setQueryMock(query),
      results: [],
      isLoading: false,
      error: null,
      search: async (input: string) => {
        searchMock(input);
      },
      clearAll: () => clearAllMock(),
    });

    render(<AreaPickerSheet open onOpenChange={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.getByText('Ketik minimal 3 karakter untuk mencari')).not.toBeNull();

    fireEvent.changeText(screen.getByPlaceholderText('Cari kecamatan/kelurahan...'), 'kel');
    expect(setQueryMock).toHaveBeenCalledWith('kel');

    renderWithDarkTheme(<AreaPickerSheet open onOpenChange={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.getAllByText('Pilih Area Pengiriman').length).toBeGreaterThan(0);
  });

  test('renders loading and not-found states', async () => {
    mockHook({ query: 'kel', isLoading: true });
    render(<AreaPickerSheet open onOpenChange={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.getByText('Mencari area...')).not.toBeNull();

    mockHook({ query: 'xyz', results: [] });
    render(<AreaPickerSheet open onOpenChange={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.getByText('Tidak ditemukan area untuk "xyz"')).not.toBeNull();
  });

  test('selects an area and closes the sheet', async () => {
    const onSelect = jest.fn();
    const onOpenChange = jest.fn();
    mockHook({ query: 'kel', results: [mockArea] });

    render(
      <AreaPickerSheet
        open
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        selectedAreaId="area-1"
      />,
    );

    fireEvent.press(screen.getByText('Kelapa Gading'));

    expect(onSelect).toHaveBeenCalledWith(mockArea);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
