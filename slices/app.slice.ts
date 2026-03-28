import { useDispatch, useSelector } from 'react-redux';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { State, Dispatch } from '@/utils/store';
import { User } from '@/types';
import type { OrderListItem } from '@/services/order.service';
import type { ProductListItem } from '@/services/home.service';
import type { CartItemWithProduct, CartListItem, CartSnapshot } from '@/types/cart';

export interface OrdersCacheEntry {
  items: OrderListItem[];
  hasMore: boolean;
  lastFetchedAt: number | null;
  lastUpdatedAt: number | null;
  payloadBytes: number;
  queryDurationMs: number;
  status: 'idle' | 'loading' | 'refreshing' | 'success' | 'error';
  error: string | null;
}

export interface UpsertOrdersCachePagePayload {
  userId: string;
  items: OrderListItem[];
  offset: number;
  hasMore: boolean;
  fetchedAt: number;
  payloadBytes: number;
  durationMs: number;
  replace?: boolean;
}

export interface SetOrdersCacheStatusPayload {
  userId: string;
  status: OrdersCacheEntry['status'];
  error?: string | null;
}

export interface ProductsCacheEntry {
  items: ProductListItem[];
  hasMore: boolean;
  lastFetchedAt: number | null;
  lastUpdatedAt: number | null;
  payloadBytes: number;
  queryDurationMs: number;
  status: 'idle' | 'loading' | 'refreshing' | 'success' | 'error';
  error: string | null;
}

export interface UpsertProductsCachePagePayload {
  categoryId: string;
  items: ProductListItem[];
  offset: number;
  hasMore: boolean;
  fetchedAt: number;
  payloadBytes: number;
  durationMs: number;
  replace?: boolean;
}

export interface SetProductsCacheStatusPayload {
  categoryId: string;
  status: ProductsCacheEntry['status'];
  error?: string | null;
}

export interface CartCacheEntry {
  items: CartItemWithProduct[];
  snapshot: CartSnapshot;
  hasMore: boolean;
  lastFetchedAt: number | null;
  lastUpdatedAt: number | null;
  payloadBytes: number;
  queryDurationMs: number;
  status: 'idle' | 'loading' | 'refreshing' | 'success' | 'error';
  error: string | null;
}

export interface UpsertCartCachePayload {
  userId: string;
  items: CartItemWithProduct[];
  snapshot: CartSnapshot;
  hasMore: boolean;
  offset: number;
  fetchedAt: number;
  payloadBytes: number;
  durationMs: number;
  replace?: boolean;
}

export interface SetCartCacheStatusPayload {
  userId: string;
  status: CartCacheEntry['status'];
  error?: string | null;
}

export interface CartCacheMetadata {
  userId: string;
  ttlMs: number;
  lastInvalidatedAt: number | null;
}

export interface SetCartCachePayload {
  userId: string;
  entry: CartCacheEntry;
}

export interface SetCartCacheMetadataPayload {
  userId: string;
  metadata: Partial<CartCacheMetadata>;
}

function createOrdersCacheEntry(): OrdersCacheEntry {
  return {
    items: [],
    hasMore: true,
    lastFetchedAt: null,
    lastUpdatedAt: null,
    payloadBytes: 0,
    queryDurationMs: 0,
    status: 'idle',
    error: null,
  };
}

function createProductsCacheEntry(): ProductsCacheEntry {
  return {
    items: [],
    hasMore: true,
    lastFetchedAt: null,
    lastUpdatedAt: null,
    payloadBytes: 0,
    queryDurationMs: 0,
    status: 'idle',
    error: null,
  };
}

function createCartCacheEntry(): CartCacheEntry {
  return {
    items: [],
    snapshot: { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 },
    hasMore: true,
    lastFetchedAt: null,
    lastUpdatedAt: null,
    payloadBytes: 0,
    queryDurationMs: 0,
    status: 'idle',
    error: null,
  };
}

function mergeOrders(existing: OrderListItem[], incoming: OrderListItem[]): OrderListItem[] {
  const itemsById = new Map(existing.map(item => [item.id, item]));

  incoming.forEach(item => {
    itemsById.set(item.id, item);
  });

  return Array.from(itemsById.values()).sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

function mergeProducts(
  existing: ProductListItem[],
  incoming: ProductListItem[],
): ProductListItem[] {
  const itemsById = new Map(existing.map(item => [item.id, item]));

  incoming.forEach(item => {
    itemsById.set(item.id, item);
  });

  return Array.from(itemsById.values()).sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

function mergeCartItems(
  existing: CartItemWithProduct[],
  incoming: CartItemWithProduct[],
): CartItemWithProduct[] {
  const itemsById = new Map(existing.map(item => [item.id, item]));

  incoming.forEach(item => {
    itemsById.set(item.id, item);
  });

  return Array.from(itemsById.values()).sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

export interface AppState {
  checked: boolean;
  loggedIn: boolean;
  user?: User;
  cartClearedAt: number | null;
  ordersCache: Record<string, OrdersCacheEntry | undefined>;
  productsCache: Record<string, ProductsCacheEntry | undefined>;
  cartCache: Record<string, CartCacheEntry | undefined>;
  cartCacheMetadata: Record<string, CartCacheMetadata | undefined>;
}

const initialState: AppState = {
  checked: false,
  loggedIn: false,
  user: undefined,
  cartClearedAt: null,
  ordersCache: {},
  productsCache: {},
  cartCache: {},
  cartCacheMetadata: {},
};

const slice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setChecked: (state: AppState, { payload }: PayloadAction<boolean>) => {
      state.checked = payload;
    },
    /** Also sets checked=true so callers don't need to dispatch setChecked separately. */
    setLoggedIn: (state: AppState, { payload }: PayloadAction<boolean>) => {
      state.checked = true;
      state.loggedIn = payload;
    },
    setUser: (state: AppState, { payload }: PayloadAction<User | undefined>) => {
      state.user = payload;
    },
    markCartCleared: (state: AppState, { payload }: PayloadAction<number>) => {
      state.cartClearedAt = payload;
    },
    upsertOrdersCachePage: (
      state: AppState,
      { payload }: PayloadAction<UpsertOrdersCachePagePayload>,
    ) => {
      const currentEntry = state.ordersCache[payload.userId] ?? createOrdersCacheEntry();
      const nextItems =
        payload.replace || payload.offset === 0
          ? payload.items
          : mergeOrders(currentEntry.items, payload.items);

      state.ordersCache[payload.userId] = {
        ...currentEntry,
        items: nextItems,
        hasMore: payload.hasMore,
        lastFetchedAt: payload.fetchedAt,
        lastUpdatedAt: Date.now(),
        payloadBytes: payload.payloadBytes,
        queryDurationMs: payload.durationMs,
        status: 'success',
        error: null,
      };
    },
    setOrdersCacheStatus: (
      state: AppState,
      { payload }: PayloadAction<SetOrdersCacheStatusPayload>,
    ) => {
      const currentEntry = state.ordersCache[payload.userId] ?? createOrdersCacheEntry();
      state.ordersCache[payload.userId] = {
        ...currentEntry,
        status: payload.status,
        error: payload.error ?? null,
      };
    },
    invalidateOrdersCache: (state: AppState, { payload }: PayloadAction<string>) => {
      const currentEntry = state.ordersCache[payload];

      if (!currentEntry) {
        return;
      }

      state.ordersCache[payload] = {
        ...currentEntry,
        lastFetchedAt: null,
        status: 'idle',
        error: null,
      };
    },
    clearOrdersCacheEntry: (state: AppState, { payload }: PayloadAction<string>) => {
      delete state.ordersCache[payload];
    },
    upsertProductsCachePage: (
      state: AppState,
      { payload }: PayloadAction<UpsertProductsCachePagePayload>,
    ) => {
      const currentEntry = state.productsCache[payload.categoryId] ?? createProductsCacheEntry();
      const nextItems =
        payload.replace || payload.offset === 0
          ? payload.items
          : mergeProducts(currentEntry.items, payload.items);

      state.productsCache[payload.categoryId] = {
        ...currentEntry,
        items: nextItems,
        hasMore: payload.hasMore,
        lastFetchedAt: payload.fetchedAt,
        lastUpdatedAt: Date.now(),
        payloadBytes: payload.payloadBytes,
        queryDurationMs: payload.durationMs,
        status: 'success',
        error: null,
      };
    },
    setProductsCacheStatus: (
      state: AppState,
      { payload }: PayloadAction<SetProductsCacheStatusPayload>,
    ) => {
      const currentEntry = state.productsCache[payload.categoryId] ?? createProductsCacheEntry();

      state.productsCache[payload.categoryId] = {
        ...currentEntry,
        status: payload.status,
        error: payload.error ?? null,
      };
    },
    invalidateProductsCache: (state: AppState, { payload }: PayloadAction<string>) => {
      const currentEntry = state.productsCache[payload];

      if (!currentEntry) {
        return;
      }

      state.productsCache[payload] = {
        ...currentEntry,
        lastFetchedAt: null,
        status: 'idle',
        error: null,
      };
    },
    clearProductsCacheEntry: (state: AppState, { payload }: PayloadAction<string>) => {
      delete state.productsCache[payload];
    },
    upsertCartCachePage: (state: AppState, { payload }: PayloadAction<UpsertCartCachePayload>) => {
      const currentEntry = state.cartCache[payload.userId] ?? createCartCacheEntry();
      const nextItems =
        payload.replace || payload.offset === 0
          ? payload.items
          : mergeCartItems(currentEntry.items, payload.items);

      state.cartCache[payload.userId] = {
        ...currentEntry,
        items: nextItems,
        snapshot: payload.snapshot,
        hasMore: payload.hasMore,
        lastFetchedAt: payload.fetchedAt,
        lastUpdatedAt: Date.now(),
        payloadBytes: payload.payloadBytes,
        queryDurationMs: payload.durationMs,
        status: 'success',
        error: null,
      };
    },
    setCartCacheStatus: (
      state: AppState,
      { payload }: PayloadAction<SetCartCacheStatusPayload>,
    ) => {
      const currentEntry = state.cartCache[payload.userId] ?? createCartCacheEntry();

      state.cartCache[payload.userId] = {
        ...currentEntry,
        status: payload.status,
        error: payload.error ?? null,
      };
    },
    invalidateCartCache: (state: AppState, { payload }: PayloadAction<string>) => {
      const currentEntry = state.cartCache[payload];

      if (!currentEntry) {
        return;
      }

      state.cartCache[payload] = {
        ...currentEntry,
        lastFetchedAt: null,
        status: 'idle',
        error: null,
      };
    },
    clearCartCacheEntry: (state: AppState, { payload }: PayloadAction<string>) => {
      delete state.cartCache[payload];
    },
    setCartCache: (state: AppState, { payload }: PayloadAction<SetCartCachePayload>) => {
      state.cartCache[payload.userId] = payload.entry;
    },
    clearCartCache: (state: AppState, { payload }: PayloadAction<string>) => {
      delete state.cartCache[payload];
      delete state.cartCacheMetadata[payload];
    },
    setCartCacheMetadata: (
      state: AppState,
      { payload }: PayloadAction<SetCartCacheMetadataPayload>,
    ) => {
      const currentMetadata = state.cartCacheMetadata[payload.userId] ?? {
        userId: payload.userId,
        ttlMs: 300000,
        lastInvalidatedAt: null,
      };
      state.cartCacheMetadata[payload.userId] = {
        ...currentMetadata,
        ...payload.metadata,
      };
    },
    reset: () => initialState,
  },
});

export const appActions = slice.actions;

export function useAppSlice() {
  const dispatch = useDispatch<Dispatch>();
  const state = useSelector(({ app }: State) => app);
  return { dispatch, ...state, ...appActions };
}

export default slice.reducer;
