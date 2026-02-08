import { test, expect } from '@jest/globals';
import { render, screen } from '../../../test-utils/renderWithTheme';
import Button from './Button';

describe('<Button />', () => {
  test('renders correctly with a title', async () => {
    render(<Button title="Click Me" />);
    const button = screen.getByText(/Click Me/i);
    expect(button).not.toBeNull();
  });
});
