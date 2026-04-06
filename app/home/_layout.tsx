import { useTheme } from 'tamagui';
import { Stack } from 'expo-router';
import { getStackHeaderOptions } from '@/utils/theme';
import { withAuthGuard } from '@/hooks/withAuthGuard';

function getProductDetailsTitle(params: unknown) {
  if (!params || typeof params !== 'object' || !('name' in params)) {
    return 'Product Details';
  }

  const { name } = params;

  return typeof name === 'string' && name.trim().length > 0 ? name : 'Product Details';
}

function getCategoryProductListTitle(params: unknown) {
  if (!params || typeof params !== 'object' || !('categoryName' in params)) {
    return 'Products';
  }

  const { categoryName } = params;

  return typeof categoryName === 'string' && categoryName.trim().length > 0
    ? categoryName
    : 'Products';
}

function HomeStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        ...getStackHeaderOptions(theme),
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="search"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="product-details"
        options={({ route }) => ({
          title: getProductDetailsTitle(route.params),
          headerShown: true,
          headerTitleAlign: 'center',
        })}
      />
      <Stack.Screen
        name="category-product-list"
        options={({ route }) => ({
          title: getCategoryProductListTitle(route.params),
          headerShown: true,
          headerTitleAlign: 'center',
        })}
      />
      <Stack.Screen
        name="all-products"
        options={{
          title: 'Semua Produk',
          headerShown: true,
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(HomeStackLayout);
