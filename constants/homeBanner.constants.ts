import type { TypedHref } from '@/types/routes.types';
import type {
  HomeBannerCtaKind,
  HomeBannerCtaRoute,
  HomeBannerIntent,
  HomeBannersByPlacement,
  HomeBannerPlacement,
} from '@/types/homeBanner';

export const HOME_BANNER_STORAGE_BUCKET = 'media';

export const HOME_BANNER_PLACEMENTS = [
  'home_banner_top',
  'home_banner_bottom',
] as const satisfies readonly HomeBannerPlacement[];

export const HOME_BANNER_INTENTS = [
  'promotional',
  'informational',
  'branding',
] as const satisfies readonly HomeBannerIntent[];

export const HOME_BANNER_CTA_KINDS = [
  'none',
  'route',
] as const satisfies readonly HomeBannerCtaKind[];

export const HOME_BANNER_CTA_ROUTES = [
  'home/all-products',
] as const satisfies readonly HomeBannerCtaRoute[];

export const HOME_BANNER_MEDIA_PREFIX_BY_PLACEMENT: Record<HomeBannerPlacement, string> = {
  home_banner_top: 'banners/home_banner_top/',
  home_banner_bottom: 'banners/home_banner_bottom/',
};

export const HOME_BANNER_CTA_ROUTE_MAP: Record<HomeBannerCtaRoute, TypedHref> = {
  'home/all-products': '/home/all-products',
};

export function createEmptyHomeBanners(): HomeBannersByPlacement {
  return {
    home_banner_top: null,
    home_banner_bottom: null,
  };
}
