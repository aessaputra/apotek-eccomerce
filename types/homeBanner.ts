import type { Tables } from '@/types/supabase';

export type HomeBannerRow = Tables<'home_banners'>;

export type HomeBannerPlacement = 'home_banner_top' | 'home_banner_bottom';

export type HomeBannerIntent = 'promotional' | 'informational' | 'branding';

export type HomeBannerCtaKind = 'none' | 'route';

export type HomeBannerCtaRoute = 'orders' | 'cart' | 'home/details';

export interface HomeBannerCTA {
  label: string;
  route: HomeBannerCtaRoute;
}

export interface HomeBannerItem {
  id: string;
  placementKey: HomeBannerPlacement;
  intent: HomeBannerIntent;
  title: string | null;
  body: string | null;
  mediaPath: string | null;
  mediaUrl: string | null;
  ctaKind: HomeBannerCtaKind;
  cta: HomeBannerCTA | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HomeBannersByPlacement {
  home_banner_top: HomeBannerItem | null;
  home_banner_bottom: HomeBannerItem | null;
}
