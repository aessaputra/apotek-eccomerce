import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import CategoryItem, { CategorySkeleton } from '@/components/elements/CategoryItem/CategoryItem';
import type { CategoryRow } from '@/services/home.service';

const category: CategoryRow = {
  id: 'category-1',
  name: 'Vitamin',
  slug: 'vitamin',
  logo_url: null,
  created_at: '2025-01-01T00:00:00Z',
};

describe('<CategoryItem />', () => {
  test('renders category and handles press', async () => {
    const onPress = jest.fn();
    render(<CategoryItem category={category} onPress={onPress} />);

    expect(screen.getByText('Vitamin')).not.toBeNull();
    fireEvent.press(screen.getByLabelText('Vitamin category'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('renders custom width and dark theme variants', async () => {
    renderWithDarkTheme(
      <CategoryItem
        category={{ ...category, name: 'Obat Flu', logo_url: 'https://example.com/logo.png' }}
        size="medium"
        layout="scroll"
        width={180}
      />,
    );

    expect(screen.getByText('Obat Flu')).not.toBeNull();
  });
});

describe('<CategorySkeleton />', () => {
  test('renders skeleton content', async () => {
    render(<CategorySkeleton isLargeScreen />);
    expect(screen.toJSON()).toBeTruthy();
  });
});
