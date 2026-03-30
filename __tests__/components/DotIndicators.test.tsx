import React from 'react';
import { render, screen, fireEvent } from '@/test-utils/renderWithTheme';
import DotIndicators from '@/components/elements/DotIndicators/DotIndicators';

describe('DotIndicators', () => {
  it('renders correct number of dots', () => {
    render(<DotIndicators total={5} currentIndex={0} />);

    const dots = screen.getAllByLabelText(/Go to image \d+ of 5/);
    expect(dots).toHaveLength(5);
  });

  it('renders nothing when total is 0', () => {
    render(<DotIndicators total={0} currentIndex={0} />);
    const dots = screen.queryAllByLabelText(/Go to image/);
    expect(dots).toHaveLength(0);
  });

  it('renders nothing when total is 1', () => {
    render(<DotIndicators total={1} currentIndex={0} />);
    const dots = screen.queryAllByLabelText(/Go to image/);
    expect(dots).toHaveLength(0);
  });

  it('calls onDotPress when a dot is pressed', () => {
    const onDotPress = jest.fn();
    render(<DotIndicators total={5} currentIndex={0} onDotPress={onDotPress} />);

    const thirdDot = screen.getByLabelText('Go to image 3 of 5');
    fireEvent.press(thirdDot);

    expect(onDotPress).toHaveBeenCalledWith(2);
  });

  it('has correct accessibility labels', () => {
    render(<DotIndicators total={3} currentIndex={1} />);

    expect(screen.getByLabelText('Go to image 1 of 3')).toBeTruthy();
    expect(screen.getByLabelText('Go to image 2 of 3')).toBeTruthy();
    expect(screen.getByLabelText('Go to image 3 of 3')).toBeTruthy();
  });
});
