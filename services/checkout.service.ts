import { supabase } from '@/utils/supabase';
import type { ShippingOption } from '@/types/shipping';
import type { Tables, TablesInsert } from '@/types/supabase';

interface CheckoutOrderParams {
  user_id: string;
  shipping_address_id: string;
  destination_area_id?: string;
  destination_postal_code?: number;
  shipping_option: ShippingOption;
  checkout_idempotency_key: string;
}

interface CheckoutOrderResult {
  order_id: string;
  total_amount: number;
  item_count: number;
}

interface SnapTokenResponse {
  snap_token: string;
  redirect_url: string;
}

interface PaymentStatusSnapshot {
  payment_status: string;
  status: string;
}

interface CartLine {
  product_id: string;
  quantity: number;
}

async function getOrCreateCartId(
  userId: string,
): Promise<{ data: string | null; error: Error | null }> {
  const { data: cartRows, error: cartError } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (cartError) {
    return { data: null, error: cartError as unknown as Error };
  }

  const existingCartId = cartRows?.[0]?.id;
  if (existingCartId) {
    return { data: existingCartId, error: null };
  }

  const { data: insertedCart, error: insertCartError } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (insertCartError) {
    return { data: null, error: insertCartError as unknown as Error };
  }

  return { data: insertedCart.id, error: null };
}

async function getCartLines(cartId: string): Promise<{ data: CartLine[]; error: Error | null }> {
  const { data: cartItems, error: cartItemsError } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('cart_id', cartId);

  if (cartItemsError) {
    return { data: [], error: cartItemsError as unknown as Error };
  }

  const lines = (cartItems ?? []) as CartLine[];

  return { data: lines, error: null };
}

export async function createCheckoutOrder(
  params: CheckoutOrderParams,
): Promise<{ data: CheckoutOrderResult | null; error: Error | null }> {
  const idempotencyKey = params.checkout_idempotency_key.trim();
  if (!idempotencyKey) {
    return {
      data: null,
      error: new Error('Missing checkout idempotency key.'),
    };
  }

  const { data: cartId, error: cartIdError } = await getOrCreateCartId(params.user_id);
  if (cartIdError || !cartId) {
    return { data: null, error: cartIdError ?? new Error('Unable to initialize cart.') };
  }

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from('orders')
    .select('id, total_amount')
    .eq('checkout_idempotency_key', idempotencyKey)
    .eq('user_id', params.user_id)
    .limit(1)
    .maybeSingle();

  if (existingOrderError) {
    return { data: null, error: existingOrderError as unknown as Error };
  }

  if (existingOrder) {
    const { data: existingItems, error: existingItemsError } = await supabase
      .from('order_items')
      .select('quantity')
      .eq('order_id', existingOrder.id);

    if (existingItemsError) {
      return { data: null, error: existingItemsError as unknown as Error };
    }

    const existingItemCount = (existingItems ?? []).reduce((sum, item) => sum + item.quantity, 0);

    return {
      data: {
        order_id: existingOrder.id,
        total_amount: existingOrder.total_amount,
        item_count: existingItemCount,
      },
      error: null,
    };
  }

  const { data: cartLines, error: cartLinesError } = await getCartLines(cartId);
  if (cartLinesError) {
    return { data: null, error: cartLinesError };
  }

  if (cartLines.length === 0) {
    return {
      data: null,
      error: new Error('Cart is empty. Add products before continuing to payment.'),
    };
  }

  const productIds = cartLines.map(item => item.product_id);
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, price, stock, is_active')
    .in('id', productIds);

  if (productError) {
    return { data: null, error: productError as unknown as Error };
  }

  const productMap = new Map(
    (
      ((products ?? []) as Pick<
        Tables<'products'>,
        'id' | 'name' | 'price' | 'stock' | 'is_active'
      >[]) ?? []
    ).map(product => [product.id, product]),
  );

  let totalAmount = 0;
  let itemCount = 0;
  const orderItems: TablesInsert<'order_items'>[] = [];

  for (const line of cartLines) {
    const product = productMap.get(line.product_id);
    if (!product || product.is_active === false) {
      return {
        data: null,
        error: new Error('One or more products are no longer available.'),
      };
    }

    if (line.quantity > product.stock) {
      return {
        data: null,
        error: new Error(`Insufficient stock for product ${product.name}.`),
      };
    }

    totalAmount += product.price * line.quantity;
    itemCount += line.quantity;

    orderItems.push({
      product_id: product.id,
      quantity: line.quantity,
      price_at_purchase: product.price,
      order_id: '',
    });
  }

  const { shipping_option: shippingOption } = params;
  const orderPayload: TablesInsert<'orders'> = {
    user_id: params.user_id,
    shipping_address_id: params.shipping_address_id,
    total_amount: totalAmount,
    status: 'pending',
    payment_status: 'unpaid',
    shipping_cost: shippingOption.price,
    shipping_etd: shippingOption.estimated_delivery,
    courier_code: shippingOption.courier_code,
    courier_service: shippingOption.service_code,
    origin_area_id: null,
    destination_area_id: params.destination_area_id ?? null,
    destination_postal_code: params.destination_postal_code ?? null,
    checkout_idempotency_key: idempotencyKey,
  };

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select('id')
    .single();

  if (orderError) {
    if ((orderError as { code?: string }).code === '23505') {
      const { data: duplicateOrder, error: duplicateOrderError } = await supabase
        .from('orders')
        .select('id, total_amount')
        .eq('checkout_idempotency_key', idempotencyKey)
        .eq('user_id', params.user_id)
        .limit(1)
        .single();

      if (duplicateOrderError) {
        return { data: null, error: duplicateOrderError as unknown as Error };
      }

      const { data: duplicateItems, error: duplicateItemsError } = await supabase
        .from('order_items')
        .select('quantity')
        .eq('order_id', duplicateOrder.id);

      if (duplicateItemsError) {
        return { data: null, error: duplicateItemsError as unknown as Error };
      }

      const duplicateItemCount = (duplicateItems ?? []).reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      return {
        data: {
          order_id: duplicateOrder.id,
          total_amount: duplicateOrder.total_amount,
          item_count: duplicateItemCount,
        },
        error: null,
      };
    }

    return { data: null, error: orderError as unknown as Error };
  }

  const orderId = order.id;

  const orderItemsPayload = orderItems.map(item => ({ ...item, order_id: orderId }));
  const { error: orderItemsError } = await supabase.from('order_items').insert(orderItemsPayload);

  if (orderItemsError) {
    await supabase.from('orders').delete().eq('id', orderId);

    return { data: null, error: orderItemsError as unknown as Error };
  }

  return {
    data: {
      order_id: orderId,
      total_amount: totalAmount,
      item_count: itemCount,
    },
    error: null,
  };
}

export async function createSnapToken(
  orderId: string,
): Promise<{ data: SnapTokenResponse | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-snap-token', {
      body: { order_id: orderId },
    });

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    const response = (data ?? {}) as Partial<SnapTokenResponse>;

    if (!response.redirect_url || !response.snap_token) {
      return {
        data: null,
        error: new Error('Invalid snap-token response from payment server.'),
      };
    }

    return {
      data: {
        snap_token: response.snap_token,
        redirect_url: response.redirect_url,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function getOrderPaymentStatus(
  orderId: string,
): Promise<{ data: PaymentStatusSnapshot | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('orders')
    .select('payment_status, status')
    .eq('id', orderId)
    .single();

  if (error) {
    return { data: null, error: error as unknown as Error };
  }

  return {
    data: data as PaymentStatusSnapshot,
    error: null,
  };
}

export async function pollOrderPaymentStatus(
  orderId: string,
  maxAttempts = 10,
  delayMs = 2000,
): Promise<{ data: PaymentStatusSnapshot | null; error: Error | null }> {
  for (let index = 0; index < maxAttempts; index += 1) {
    const { data, error } = await getOrderPaymentStatus(orderId);

    if (error) {
      return { data: null, error };
    }

    const paymentStatus = data?.payment_status ?? '';
    if (paymentStatus === 'success' || paymentStatus === 'failed') {
      return { data, error: null };
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return {
    data: null,
    error: new Error('Payment confirmation is still pending. Please check your orders tab.'),
  };
}
