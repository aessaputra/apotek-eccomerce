import { Stack } from 'expo-router';
import { useTheme } from 'tamagui';
import { getStackHeaderOptions } from '@/utils/theme';
import { withAuthGuard } from '@/hooks/withAuthGuard';

function getProductDetailsTitle(params: unknown) {
  if (!params || typeof params !== 'object' || !('name' in params)) {
    return 'Product Details';
  }

  const { name } = params;

  return typeof name === 'string' && name.trim().length > 0 ? name : 'Product Details';
}

function ProductDetailsStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        ...getStackHeaderOptions(theme),
      }}>
      <Stack.Screen
        name="index"
        options={({ route }) => ({
          title: getProductDetailsTitle(route.params),
          headerShown: true,
          headerTitleAlign: 'center',
        })}
      />
    </Stack>
  );
}

export default withAuthGuard(ProductDetailsStackLayout);
