import { test, expect, jest } from '@jest/globals';
import { StyleSheet } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import QuantitySelector from '@/components/elements/QuantitySelector/QuantitySelector';

function findAncestorWithStyle(
  node: ReactTestInstance,
  matcher: (style: Record<string, unknown>) => boolean,
) {
  let current = node.parent;

  while (current) {
    const style = StyleSheet.flatten(current.props.style) as Record<string, unknown>;

    if (matcher(style)) {
      return current;
    }

    current = current.parent;
  }

  throw new Error('Expected ancestor style was not found');
}

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

  test('uses 48px touch targets and aligned value card for both sizes', () => {
    const { rerender } = render(
      <QuantitySelector value={12} min={1} max={99} onChange={jest.fn()} />,
    );

    findAncestorWithStyle(
      screen.getByText('-'),
      style => style?.width === 48 && style.height === 48,
    );
    findAncestorWithStyle(
      screen.getByText('+'),
      style => style?.width === 48 && style.height === 48,
    );
    findAncestorWithStyle(
      screen.getByText('12'),
      style => style?.minWidth === 56 && style.height === 48,
    );

    rerender(<QuantitySelector value={12} min={1} max={99} onChange={jest.fn()} size="sm" />);

    findAncestorWithStyle(
      screen.getByText('-'),
      style => style?.width === 48 && style.height === 48,
    );
    findAncestorWithStyle(
      screen.getByText('+'),
      style => style?.width === 48 && style.height === 48,
    );
    findAncestorWithStyle(
      screen.getByText('12'),
      style => style?.minWidth === 48 && style.height === 48,
    );
  });

  test('updates displayed value without remounting the value text', () => {
    const { rerender } = render(
      <QuantitySelector value={2} min={1} max={5} onChange={jest.fn()} />,
    );
    const valueText = screen.getByText('2');

    rerender(<QuantitySelector value={3} min={1} max={5} onChange={jest.fn()} />);

    expect(valueText.props.children).toBe(3);
  });
});
