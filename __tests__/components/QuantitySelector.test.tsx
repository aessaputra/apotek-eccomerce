import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import QuantitySelector from '@/components/elements/QuantitySelector/QuantitySelector';

describe('<QuantitySelector />', () => {
  test('increments and decrements within bounds', async () => {
    const onChange = jest.fn();
    render(<QuantitySelector value={2} min={1} max={5} onChange={onChange} />);

    fireEvent.press(screen.getByText('+'));
    fireEvent.press(screen.getByText('-'));

    expect(onChange).toHaveBeenCalledWith(3);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  test('allows direct editing and clamps submitted values', async () => {
    const onChange = jest.fn();
    render(<QuantitySelector value={2} min={1} max={5} onChange={onChange} />);

    fireEvent.press(screen.getByText('2'));
    const input = screen.getByDisplayValue('2');

    fireEvent.changeText(input, '9');
    fireEvent(input, 'submitEditing');

    expect(onChange).toHaveBeenCalledWith(5);
  });

  test('does not change when disabled and renders in dark theme', async () => {
    const onChange = jest.fn();
    render(<QuantitySelector value={1} min={1} max={5} onChange={onChange} disabled />);

    fireEvent.press(screen.getByText('+'));
    expect(onChange).not.toHaveBeenCalled();

    renderWithDarkTheme(<QuantitySelector value={3} min={1} max={5} onChange={jest.fn()} />);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });
});
