import { supabase } from '@/utils/supabase';
import type { Tables } from '@/types/supabase';
import type { CartItemWithProduct, CartSnapshot, CartWithItems } from '@/types/cart';

type CartRow = Tables<'carts'>;
type CartItemRow = Tables<'cart_items'>;
type ProductRow = Tables<'products'>;
type ProductImageRow = Tables<'product_images'>;

const DEFAULT_ITEM_WEIGHT_GRAMS = 200;

async function getOrCreateCart(
  userId: string,
): Promise<{ data: CartRow | null; error: Error | null }> {
  const { data: existingCarts, error: fetchError } = await supabase
    .from('carts')
    .select('*')
    .eq('user_id', userId)
    .limit(1);

  if (fetchError) {
    return { data: null, error: fetchError as unknown as Error };
  }

  const existingCart = existingCarts?.[0];
  if (existingCart) {
    return { data: existingCart, error: null };
  }

  const { data: newCart, error: insertError } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('*')
    .single();

  if (insertError) {
    return { data: null, error: insertError as unknown as Error };
  }

  return { data: newCart, error: null };
}

export async function getCartWithItems(
  userId: string,
): Promise<{ data: CartWithItems | null; error: Error | null }> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return { data: null, error: new Error('User ID is required.') };
  }

  const { data: cart, error: cartError } = await getOrCreateCart(normalizedUserId);
  if (cartError || !cart) {
    return { data: null, error: cartError ?? new Error('Unable to initialize cart.') };
  }

  const { data: cartItems, error: itemsError } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id);

  if (itemsError) {
    return { data: null, error: itemsError as unknown as Error };
  }

  if (!cartItems || cartItems.length === 0) {
    return {
      data: {
        cartId: cart.id,
        items: [],
        snapshot: { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 },
      },
      error: null,
    };
  }

  const productIds = cartItems.map(item => item.product_id);

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, stock, weight, slug, is_active')
    .in('id', productIds);

  if (productsError) {
    return { data: null, error: productsError as unknown as Error };
  }

  const { data: images, error: imagesError } = await supabase
    .from('product_images')
    .select('id, product_id, url, sort_order')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true });

  if (imagesError) {
    return { data: null, error: imagesError as unknown as Error };
  }

  const productMap = new Map<string, ProductRow>();
  for (const product of (products ?? []) as ProductRow[]) {
    productMap.set(product.id, product);
  }
  const imagesByProduct = new Map<string, ProductImageRow[]>();

  for (const image of (images ?? []) as ProductImageRow[]) {
    const existing = imagesByProduct.get(image.product_id) ?? [];
    existing.push(image);
    imagesByProduct.set(image.product_id, existing);
  }

  const itemsWithProducts: CartItemWithProduct[] = [];

  for (const item of cartItems as CartItemRow[]) {
    const product = productMap.get(item.product_id);
    if (!product) continue;

    const productImages = imagesByProduct.get(item.product_id) ?? [];

    itemsWithProducts.push({
      id: item.id,
      cart_id: item.cart_id,
      product_id: item.product_id,
      quantity: item.quantity,
      created_at: item.created_at,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        weight: product.weight,
        slug: product.slug,
        is_active: product.is_active ?? false,
      },
      images: productImages.map(img => ({
        id: img.id,
        url: img.url,
        sort_order: img.sort_order,
      })),
    });
  }

  let itemCount = 0;
  let estimatedWeightGrams = 0;
  let packageValue = 0;

  for (const item of itemsWithProducts) {
    itemCount += item.quantity;
    estimatedWeightGrams += item.quantity * (item.product.weight || DEFAULT_ITEM_WEIGHT_GRAMS);
    packageValue += item.quantity * item.product.price;
  }

  const snapshot: CartSnapshot = {
    itemCount,
    estimatedWeightGrams,
    packageValue,
  };

  return {
    data: {
      cartId: cart.id,
      items: itemsWithProducts,
      snapshot,
    },
    error: null,
  };
}

export async function updateCartItemQuantity(
  cartItemId: string,
  newQuantity: number,
): Promise<{ data: boolean; error: Error | null }> {
  const normalizedCartItemId = cartItemId.trim();
  if (!normalizedCartItemId) {
    return { data: false, error: new Error('Cart item ID is required.') };
  }

  if (newQuantity <= 0) {
    return { data: false, error: new Error('Quantity must be greater than 0.') };
  }

  const { data: cartItem, error: fetchError } = await supabase
    .from('cart_items')
    .select('id, product_id')
    .eq('id', normalizedCartItemId)
    .single();

  if (fetchError) {
    return { data: false, error: fetchError as unknown as Error };
  }

  if (!cartItem) {
    return { data: false, error: new Error('Cart item not found.') };
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('stock, name')
    .eq('id', cartItem.product_id)
    .single();

  if (productError) {
    return { data: false, error: productError as unknown as Error };
  }

  if (!product) {
    return { data: false, error: new Error('Product not found.') };
  }

  if (newQuantity > product.stock) {
    return { data: false, error: new Error('Stok tidak mencukupi') };
  }

  const { error: updateError } = await supabase
    .from('cart_items')
    .update({ quantity: newQuantity })
    .eq('id', normalizedCartItemId);

  if (updateError) {
    return { data: false, error: updateError as unknown as Error };
  }

  return { data: true, error: null };
}

export async function removeCartItem(
  cartItemId: string,
): Promise<{ data: boolean; error: Error | null }> {
  const normalizedCartItemId = cartItemId.trim();
  if (!normalizedCartItemId) {
    return { data: false, error: new Error('Cart item ID is required.') };
  }

  const { error: deleteError } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', normalizedCartItemId);

  if (deleteError) {
    return { data: false, error: deleteError as unknown as Error };
  }

  return { data: true, error: null };
}

export async function getCartItemCount(
  userId: string,
): Promise<{ data: number; error: Error | null }> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return { data: 0, error: new Error('User ID is required.') };
  }

  const { data: cart, error: cartError } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', normalizedUserId)
    .limit(1)
    .maybeSingle();

  if (cartError) {
    return { data: 0, error: cartError as unknown as Error };
  }

  if (!cart) {
    return { data: 0, error: null };
  }

  const { data: cartItems, error: itemsError } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('cart_id', cart.id);

  if (itemsError) {
    return { data: 0, error: itemsError as unknown as Error };
  }

  const totalCount = (cartItems ?? []).reduce((sum, item) => sum + item.quantity, 0);

  return { data: totalCount, error: null };
}
