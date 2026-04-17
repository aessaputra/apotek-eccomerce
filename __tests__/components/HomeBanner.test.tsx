import { test, expect, jest } from '@jest/globals';
import { fireEvent, render, renderWithDarkTheme, screen } from '@/test-utils/renderWithTheme';
import HomeBanner, { HomeBannerSkeleton } from '@/components/elements/HomeBanner/HomeBanner';
import type { HomeBannerItem } from '@/types/homeBanner';

const mockBanner: HomeBannerItem = {
  id: 'home-banner-top',
  placementKey: 'home_banner_top',
  intent: 'informational',
  title: 'Test Banner Title',
  body: 'Test banner body text',
  mediaPath: null,
  mediaUrl: null,
  ctaKind: 'route',
  cta: { label: 'Learn More', route: 'home/all-products' },
  isActive: true,
  createdAt: '2026-04-03T00:00:00Z',
  updatedAt: '2026-04-03T00:00:00Z',
};

describe('<HomeBanner />', () => {
  describe('Content Banner Mode', () => {
    test('renders correctly with full banner data (title, body, CTA)', async () => {
      render(<HomeBanner banner={mockBanner} />);

      expect(screen.getByText('Test Banner Title')).toBeTruthy();
      expect(screen.getByText('Test banner body text')).toBeTruthy();
      expect(screen.getByText('Learn More')).toBeTruthy();
    });

    test('renders correctly in dark theme', async () => {
      renderWithDarkTheme(<HomeBanner banner={mockBanner} />);

      expect(screen.getByText('Test Banner Title')).toBeTruthy();
    });

    test('renders with mediaUrl as background image', async () => {
      render(
        <HomeBanner
          banner={{
            ...mockBanner,
            mediaPath: 'banners/home_banner_top/test-banner.webp',
            mediaUrl: 'https://example.com/test-banner.webp',
          }}
        />,
      );

      expect(screen.getByTestId('home-banner-image-home_banner_top')).toBeTruthy();
      expect(screen.getByText('Test Banner Title')).toBeTruthy();
    });

    test('renders branding intent without CTA', async () => {
      render(
        <HomeBanner
          banner={{
            ...mockBanner,
            placementKey: 'home_banner_bottom',
            title: 'Branding banner',
            body: null,
            ctaKind: 'none',
            cta: null,
            intent: 'branding',
            mediaPath: null,
            mediaUrl: null,
          }}
        />,
      );

      expect(screen.getByTestId('home-banner-home_banner_bottom')).toBeTruthy();
      expect(screen.queryByText('Learn More')).toBeNull();
    });

    test('calls onCTAPress when CTA button is pressed', async () => {
      const onCTAPress = jest.fn();
      render(<HomeBanner banner={mockBanner} onCTAPress={onCTAPress} />);

      fireEvent.press(screen.getByText('Learn More'));

      expect(onCTAPress).toHaveBeenCalledTimes(1);
      expect(onCTAPress).toHaveBeenCalledWith(mockBanner.cta);
    });
  });

  describe('Image-Only Banner Mode', () => {
    test('renders full-image treatment when no text and no CTA but has mediaUrl', async () => {
      render(
        <HomeBanner
          banner={{
            ...mockBanner,
            title: null,
            body: null,
            ctaKind: 'none',
            cta: null,
            mediaPath: 'banners/home_banner_top/image-only.webp',
            mediaUrl: 'https://example.com/image-only.webp',
          }}
        />,
      );

      expect(screen.getByTestId('home-banner-home_banner_top')).toBeTruthy();
      expect(screen.getByTestId('home-banner-image-home_banner_top')).toBeTruthy();
      expect(screen.queryByText('Test Banner Title')).toBeNull();
      expect(screen.queryByText('Learn More')).toBeNull();
    });

    test('renders image-only with valid CTA but no text (tappable CTA behavior)', async () => {
      const onCTAPress = jest.fn();
      render(
        <HomeBanner
          banner={{
            ...mockBanner,
            title: null,
            body: null,
            ctaKind: 'route',
            cta: { label: 'Shop Now', route: 'home/all-products' },
            mediaUrl: 'https://example.com/banner.webp',
          }}
          onCTAPress={onCTAPress}
        />,
      );

      expect(screen.getByTestId('home-banner-home_banner_top')).toBeTruthy();
      expect(screen.getByText('Shop Now')).toBeTruthy();
      fireEvent.press(screen.getByText('Shop Now'));
      expect(onCTAPress).toHaveBeenCalled();
    });
  });

  describe('Image Load Failure', () => {
    test('image-only banner falls back to themed background when image fails to load', async () => {
      render(
        <HomeBanner
          banner={{
            ...mockBanner,
            title: null,
            body: null,
            ctaKind: 'none',
            cta: null,
            mediaPath: 'banners/home_banner_top/missing.webp',
            mediaUrl: 'https://example.com/missing.webp',
          }}
        />,
      );

      const container = screen.getByTestId('home-banner-home_banner_top');
      expect(container).toBeTruthy();

      const image = screen.getByTestId('home-banner-image-home_banner_top');
      expect(image).toBeTruthy();

      fireEvent(image, 'error');

      expect(screen.queryByTestId('home-banner-image-home_banner_top')).toBeNull();
      expect(screen.getByTestId('home-banner-home_banner_top')).toBeTruthy();
    });

    test('mixed banner (text + image) falls back to themed background when image fails', async () => {
      render(
        <HomeBanner
          banner={{
            ...mockBanner,
            mediaPath: 'banners/home_banner_top/missing.webp',
            mediaUrl: 'https://example.com/missing.webp',
          }}
        />,
      );

      expect(screen.getByTestId('home-banner-image-home_banner_top')).toBeTruthy();
      expect(screen.getByText('Test Banner Title')).toBeTruthy();

      fireEvent(screen.getByTestId('home-banner-image-home_banner_top'), 'error');

      expect(screen.queryByTestId('home-banner-image-home_banner_top')).toBeNull();
      expect(screen.getByText('Test Banner Title')).toBeTruthy();
      expect(screen.getByText('Test banner body text')).toBeTruthy();
      expect(screen.getByText('Learn More')).toBeTruthy();
    });

    test('image-only banner with informational intent renders fallback on error', async () => {
      render(
        <HomeBanner
          banner={{
            ...mockBanner,
            title: null,
            body: null,
            ctaKind: 'none',
            cta: null,
            intent: 'informational',
            mediaPath: 'banners/home_banner_top/missing.webp',
            mediaUrl: 'https://example.com/missing.webp',
          }}
        />,
      );

      fireEvent(screen.getByTestId('home-banner-image-home_banner_top'), 'error');

      expect(screen.getByTestId('home-banner-home_banner_top')).toBeTruthy();
    });

    test('banner with failed image preserves CTA interactivity', async () => {
      const onCTAPress = jest.fn();
      render(
        <HomeBanner
          banner={{
            ...mockBanner,
            mediaPath: 'banners/home_banner_top/missing.webp',
            mediaUrl: 'https://example.com/missing.webp',
          }}
          onCTAPress={onCTAPress}
        />,
      );

      fireEvent(screen.getByTestId('home-banner-image-home_banner_top'), 'error');

      expect(screen.getByText('Learn More')).toBeTruthy();
      fireEvent.press(screen.getByText('Learn More'));
      expect(onCTAPress).toHaveBeenCalledTimes(1);
    });

    test('retries image rendering when mediaUrl changes after a previous failure', async () => {
      const { rerender } = render(
        <HomeBanner
          banner={{
            ...mockBanner,
            mediaPath: 'banners/home_banner_top/missing.webp',
            mediaUrl: 'https://example.com/missing.webp',
          }}
        />,
      );

      fireEvent(screen.getByTestId('home-banner-image-home_banner_top'), 'error');
      expect(screen.queryByTestId('home-banner-image-home_banner_top')).toBeNull();

      rerender(
        <HomeBanner
          banner={{
            ...mockBanner,
            mediaPath: 'banners/home_banner_top/recovered.webp',
            mediaUrl: 'https://example.com/recovered.webp',
          }}
        />,
      );

      expect(screen.getByTestId('home-banner-image-home_banner_top')).toBeTruthy();
    });
  });

  describe('Render Nothing Cases', () => {
    test('renders nothing when banner is null', async () => {
      render(<HomeBanner banner={null} />);

      expect(screen.queryByTestId('home-banner-home_banner_top')).toBeNull();
    });

    test('renders nothing when banner has no visible content', async () => {
      render(
        <HomeBanner
          banner={{
            ...mockBanner,
            title: null,
            body: null,
            ctaKind: 'none',
            cta: null,
            mediaPath: null,
            mediaUrl: null,
          }}
        />,
      );

      expect(screen.queryByTestId('home-banner-home_banner_top')).toBeNull();
    });
  });

  describe('Skeleton State', () => {
    test('renders skeleton state', async () => {
      render(<HomeBannerSkeleton />);

      expect(screen.getByTestId('home-banner-skeleton')).toBeTruthy();
    });

    test('renders skeleton without illustration placeholder', async () => {
      render(<HomeBannerSkeleton showIllustration={false} />);

      expect(screen.getByTestId('home-banner-skeleton')).toBeTruthy();
    });
  });
});
