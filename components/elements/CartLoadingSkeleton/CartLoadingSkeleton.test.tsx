import { test, expect } from '@jest/globals';
import { render, renderWithDarkTheme, screen } from '../../../test-utils/renderWithTheme';
import CartLoadingSkeletonComponent from './CartLoadingSkeleton';

describe('<CartLoadingSkeleton />', () => {
  test('renders default skeleton rows in light and dark themes', async () => {
    render(<CartLoadingSkeletonComponent />);
    expect(screen.toJSON()).toBeTruthy();

    renderWithDarkTheme(<CartLoadingSkeletonComponent />);
    expect(screen.toJSON()).toBeTruthy();
  });

  test('renders a custom row count', async () => {
    render(<CartLoadingSkeletonComponent rowCount={2} />);
    expect(screen.toJSON()).toBeTruthy();
  });
});
