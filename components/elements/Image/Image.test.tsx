import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Image from './Image';
import { images } from '@/utils/images';

describe('<Image />', () => {
  it('renders correctly with a local asset', () => {
    render(<Image testID="image" source={images.logo_sm} />);
    const image = screen.getByTestId(/image/i);
    expect(image).not.toBeNull();
  });
});
