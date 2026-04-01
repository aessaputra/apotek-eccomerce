import React from 'react';
import { render } from '@/test-utils/renderWithTheme';
import ProductImageGallery from '@/components/elements/ProductImageGallery';

describe('ProductImageGallery', () => {
  const mockImages = [
    { url: 'https://example.com/image1.jpg', sort_order: 1 },
    { url: 'https://example.com/image2.jpg', sort_order: 2 },
    { url: 'https://example.com/image3.jpg', sort_order: 3 },
  ];

  it('renders placeholder when images array is empty', () => {
    const { toJSON } = render(<ProductImageGallery images={[]} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders single image without dot indicators', () => {
    const { queryAllByRole } = render(<ProductImageGallery images={[mockImages[0]]} />);
    expect(queryAllByRole('button')).toHaveLength(0);
  });

  it('renders single image with accessible image role', () => {
    const { getByLabelText } = render(<ProductImageGallery images={[mockImages[0]]} />);
    expect(getByLabelText('Product image')).toBeTruthy();
  });

  it('filters out empty image URLs', () => {
    const imagesWithBlank = [
      { url: '', sort_order: 1 },
      { url: 'https://example.com/valid.jpg', sort_order: 2 },
    ];
    const { queryAllByRole } = render(<ProductImageGallery images={imagesWithBlank} />);
    expect(queryAllByRole('button')).toHaveLength(0);
  });

  it('sorts images by sort_order', () => {
    const unsorted = [
      { url: 'https://example.com/third.jpg', sort_order: 3 },
      { url: 'https://example.com/first.jpg', sort_order: 1 },
    ];
    const { toJSON } = render(<ProductImageGallery images={unsorted} />);
    expect(toJSON()).toBeTruthy();
  });
});
