import type { Href } from 'expo-router';

// Auth routes
export type AuthRoutes = {
  '(auth)/login': undefined;
  '(auth)/signup': undefined;
};

// Home routes
export type HomeRoutes = {
  home: undefined;
  'home/index': undefined;
  'home/details': undefined;
  'home/product-details': { id: string; name?: string };
  'home/category-product-list': { categoryId: string; categoryName?: string };
  'home/all-products': undefined;
};

// Cart routes
export type CartRoutes = {
  cart: undefined;
  'cart/index': undefined;
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
  'profile/address-form': { id?: string };
  'profile/address-search': { query?: string; latitude?: string; longitude?: string };
  'profile/area-picker': { selectedAreaId?: string };
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
  CartRoutes &
  OrdersRoutes &
  ProfileRoutes &
  GoogleAuthRoutes;

export type ProfileStackParams = {
  index: undefined;
  addresses: undefined;
  'address-form': { id?: string };
  'address-search': { query?: string; latitude?: string; longitude?: string };
  'area-picker': { selectedAreaId?: string };
  'edit-profile': undefined;
  details: undefined;
  support: undefined;
  'order-detail/[orderId]': { orderId: string };
};

export type HomeStackParams = {
  index: undefined;
  details: undefined;
  'product-details': { id: string; name?: string };
  'category-product-list': { categoryId: string; categoryName?: string };
  'all-products': undefined;
};

export type CartStackParams = {
  index: undefined;
  payment: { paymentUrl?: string; orderId?: string };
};

export type OrdersStackParams = {
  index: undefined;
  success: { orderId?: string };
  'order-detail/[orderId]': { orderId: string };
  'track-shipment/[orderId]': { orderId: string };
};

export type AuthStackParams = {
  login: undefined;
  signup: undefined;
};

export type TypedHref = Href<AppRoutes>;

export type RouteParams<T extends keyof AppRoutes> = AppRoutes[T];
