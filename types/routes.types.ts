import type { Href } from 'expo-router';

export type AddressFormReturnTo = '/cart';

// Auth routes
export type AuthRoutes = {
  '(auth)/login': { resetSuccess?: string; error?: string } | undefined;
  '(auth)/forgot-password': undefined;
  '(auth)/reset-password': {
    token_hash?: string;
    type?: string;
    code?: string;
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  };
  '(auth)/signup': undefined;
  '(auth)/verify-email': { email: string };
  '(auth)/verify-mfa': undefined;
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
    selectedCartItemIdsPayload?: string;
    quoteAreaId?: string;
    quotePostalCode?: string;
  };
  'cart/payment': { paymentUrl?: string; orderId?: string };
};

// Orders routes
export type OrdersRoutes = {
  orders: undefined;
  'orders/index': undefined;
  'orders/all': undefined;
  'orders/unpaid': undefined;
  'orders/packing': undefined;
  'orders/shipped': undefined;
  'orders/completed': undefined;
  'orders/cancelled': undefined;
  'orders/order-detail/[orderId]': { orderId: string };
  'orders/track-shipment/[orderId]': { orderId: string };
};

export type PaymentSuccessRoutes = {
  'payment-success': { orderId?: string };
};

// Notifications routes
export type NotificationsRoutes = {
  notifications: undefined;
  'notifications/index': undefined;
  'notifications/order-detail/[orderId]': { orderId: string };
  'notifications/track-shipment/[orderId]': { orderId: string };
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
  'profile/two-step-verification': undefined;
  'profile/details': undefined;
  'profile/support': undefined;
  'profile/order-detail/[orderId]': { orderId: string };
  'profile/track-shipment/[orderId]': { orderId: string };
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
  PaymentSuccessRoutes &
  NotificationsRoutes &
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
  'two-step-verification': undefined;
  details: undefined;
  support: undefined;
  'order-detail/[orderId]': { orderId: string };
  'track-shipment/[orderId]': { orderId: string };
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
    selectedCartItemIdsPayload?: string;
    quoteAreaId?: string;
    quotePostalCode?: string;
  };
  payment: { paymentUrl?: string; orderId?: string };
};

export type OrdersStackParams = {
  index: undefined;
  all: undefined;
  unpaid: undefined;
  packing: undefined;
  shipped: undefined;
  completed: undefined;
  cancelled: undefined;
  'order-detail/[orderId]': { orderId: string };
  'track-shipment/[orderId]': { orderId: string };
};

export type NotificationsStackParams = {
  index: undefined;
  'order-detail/[orderId]': { orderId: string };
  'track-shipment/[orderId]': { orderId: string };
};

export type AuthStackParams = {
  login: { resetSuccess?: string; error?: string } | undefined;
  'forgot-password': undefined;
  'reset-password': {
    token_hash?: string;
    type?: string;
    code?: string;
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  };
  signup: undefined;
  'verify-email': { email: string };
  'verify-mfa': undefined;
};

export type TypedHref = Href<AppRoutes>;

export type RouteParams<T extends keyof AppRoutes> = AppRoutes[T];
