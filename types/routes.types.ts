import type { Href } from 'expo-router';

export type AddressFormReturnTo = '/cart';

// Auth routes
export type AuthRoutes = {
  '(auth)/login': { resetSuccess?: string; error?: string } | undefined;
  '(auth)/forgot-password': undefined;
  '(auth)/reset-password': {
    token_hash?: string;
    type?: string;
    error?: string;
  };
  '(auth)/signup': undefined;
  '(auth)/verify-email': { email: string };
};

// Home routes
export type HomeRoutes = {
  home: undefined;
  'home/index': undefined;
  'home/category-product-list': { categoryId: string; categoryName?: string };
  'home/all-products': undefined;
};

export type ProductDetailsRoutes = {
  'product-details': { id: string; name?: string };
};

// Cart routes
export type CartRoutes = {
  cart: undefined;
  'cart/index': undefined;
  'cart/review': {
    addressPayload?: string;
    addressText?: string;
    shippingOptionPayload?: string;
    selectedShippingKey?: string;
    snapshotPayload?: string;
    itemSummariesPayload?: string;
    quoteAreaId?: string;
    quotePostalCode?: string;
  };
  'cart/payment': { paymentUrl?: string; orderId?: string };
};

// Orders routes
export type OrdersRoutes = {
  orders: undefined;
  'orders/index': undefined;
  'orders/success': { orderId?: string };
  'orders/order-detail/[orderId]': { orderId: string };
  'orders/track-shipment/[orderId]': { orderId: string };
};

// Profile routes
export type ProfileRoutes = {
  profile: undefined;
  'profile/index': undefined;
  'profile/addresses': undefined;
  'profile/address-form': { id?: string; returnTo?: AddressFormReturnTo };
  'profile/address-search': { query?: string; latitude?: string; longitude?: string };
  'profile/area-picker': { selectedAreaId?: string };
  'profile/address-map': {
    latitude?: string;
    longitude?: string;
    streetAddress?: string;
    areaName?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  'profile/edit-profile': undefined;
  'profile/details': undefined;
  'profile/support': undefined;
  'profile/order-detail/[orderId]': { orderId: string };
};

// Google auth callback
export type GoogleAuthRoutes = {
  'google-auth': undefined;
};

export type AppRoutes = AuthRoutes &
  HomeRoutes &
  ProductDetailsRoutes &
  CartRoutes &
  OrdersRoutes &
  ProfileRoutes &
  GoogleAuthRoutes;

export type ProfileStackParams = {
  index: undefined;
  addresses: undefined;
  'address-form': { id?: string; returnTo?: AddressFormReturnTo };
  'address-search': { query?: string; latitude?: string; longitude?: string };
  'area-picker': { selectedAreaId?: string };
  'address-map': {
    latitude?: string;
    longitude?: string;
    streetAddress?: string;
    areaName?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  'edit-profile': undefined;
  details: undefined;
  support: undefined;
  'order-detail/[orderId]': { orderId: string };
};

export type HomeStackParams = {
  index: undefined;
  'category-product-list': { categoryId: string; categoryName?: string };
  'all-products': undefined;
};

export type CartStackParams = {
  index: undefined;
  review: {
    addressPayload?: string;
    addressText?: string;
    shippingOptionPayload?: string;
    selectedShippingKey?: string;
    snapshotPayload?: string;
    itemSummariesPayload?: string;
    quoteAreaId?: string;
    quotePostalCode?: string;
  };
  payment: { paymentUrl?: string; orderId?: string };
};

export type OrdersStackParams = {
  index: undefined;
  success: { orderId?: string };
  'order-detail/[orderId]': { orderId: string };
  'track-shipment/[orderId]': { orderId: string };
};

export type AuthStackParams = {
  login: { resetSuccess?: string; error?: string } | undefined;
  'forgot-password': undefined;
  'reset-password': {
    token_hash?: string;
    type?: string;
    error?: string;
  };
  signup: undefined;
  'verify-email': { email: string };
};

export type TypedHref = Href<AppRoutes>;

export type RouteParams<T extends keyof AppRoutes> = AppRoutes[T];
