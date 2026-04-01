import { test, expect } from '@jest/globals';
import { render, renderWithDarkTheme, screen, waitFor } from '@/test-utils/renderWithTheme';
import Button from '@/components/elements/Button';

describe('<Button />', () => {
  test('renders correctly with a title', async () => {
    render(<Button title="Click Me" />);

    await waitFor(() => {
      const button = screen.getByText(/Click Me/i);
      expect(button).not.toBeNull();
    });
  });

  test('renders correctly in dark theme', async () => {
    renderWithDarkTheme(<Button title="Dark Click" />);

    await waitFor(() => {
      const button = screen.getByText(/Dark Click/i);
      expect(button).not.toBeNull();
    });
  });
});
