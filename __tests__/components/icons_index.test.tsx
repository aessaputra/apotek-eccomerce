import { test, expect } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import * as Icons from '@/components/icons';

jest.mock('@tamagui/lucide-icons', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');

  const createMockIcon = (name: string) => {
    function MockIcon({ size, color }: { size?: number | string; color?: string }) {
      return <Text>{`${name}:${size ?? ''}:${color ?? ''}`}</Text>;
    }

    MockIcon.displayName = `${name}MockIcon`;
    return MockIcon;
  };

  return {
    __esModule: true,
    AlertCircle: createMockIcon('AlertCircle'),
    Bell: createMockIcon('Bell'),
    CheckCircle2: createMockIcon('CheckCircle2'),
    ChevronLeft: createMockIcon('ChevronLeft'),
    CircleHelp: createMockIcon('CircleHelp'),
    Check: createMockIcon('Check'),
    ChevronRight: createMockIcon('ChevronRight'),
    Chrome: createMockIcon('Chrome'),
    Clock: createMockIcon('Clock'),
    CreditCard: createMockIcon('CreditCard'),
    Eye: createMockIcon('Eye'),
    EyeOff: createMockIcon('EyeOff'),
    Grid2x2: createMockIcon('Grid2x2'),
    Heart: createMockIcon('Heart'),
    History: createMockIcon('History'),
    Home: createMockIcon('Home'),
    Lock: createMockIcon('Lock'),
    MapPin: createMockIcon('MapPin'),
    MoreHorizontal: createMockIcon('MoreHorizontal'),
    Package: createMockIcon('Package'),
    Pencil: createMockIcon('Pencil'),
    Pill: createMockIcon('Pill'),
    Search: createMockIcon('Search'),
    Settings2: createMockIcon('Settings2'),
    ShoppingBag: createMockIcon('ShoppingBag'),
    ShoppingCart: createMockIcon('ShoppingCart'),
    Star: createMockIcon('Star'),
    Trash2: createMockIcon('Trash2'),
    Truck: createMockIcon('Truck'),
    User: createMockIcon('User'),
    Wallet: createMockIcon('Wallet'),
    Wrench: createMockIcon('Wrench'),
    X: createMockIcon('X'),
    XCircle: createMockIcon('XCircle'),
  };
});

describe('icons index', () => {
  test('forwards props through every exported icon wrapper', async () => {
    const exportedIcons = Object.entries(Icons).filter(([name]) => name.endsWith('Icon'));

    render(
      <>
        {exportedIcons.map(([name, IconComponent]) => {
          const Component = IconComponent as (props: {
            size?: number;
            color?: string;
          }) => JSX.Element;
          return <Component key={name} size={16} color="red" />;
        })}
      </>,
    );

    expect(screen.getByText('Home:16:red')).not.toBeNull();
    expect(screen.getByText('ShoppingCart:16:red')).not.toBeNull();
    expect(screen.getByText('Truck:16:red')).not.toBeNull();
    expect(exportedIcons.length).toBeGreaterThan(10);
  });
});
