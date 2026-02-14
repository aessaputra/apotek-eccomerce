import { useCallback, memo } from 'react';
import { ScrollView, Alert } from 'react-native';
import { YStack, XStack, Text, useTheme, Card } from 'tamagui';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Avatar from '@/components/elements/Avatar';
import { useAppSlice } from '@/slices';
import { useDataPersist, DataPersistKeys } from '@/hooks';
import { signOut as authSignOut } from '@/services/auth.service';
import { Spinner } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { windowWidth } from '@/utils/deviceInfo';

interface MenuItemProps {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
}

const MenuItem = memo(function MenuItem({
  label,
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: MenuItemProps) {
  const theme = useTheme();
  const iconColor = getThemeColor(theme, 'colorPress', '#6B7280');

  return (
    <Card
      padding="$4"
      marginBottom="$3"
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$surfaceBorder"
      borderRadius="$4"
      elevation={1}
      pressStyle={{ opacity: 0.85, backgroundColor: '$backgroundHover' }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}>
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" space="$3" flex={1}>
          <Ionicons name={icon} size={22} color={iconColor} />
          <Text fontSize="$4" color="$color" fontWeight="500">
            {label}
          </Text>
        </XStack>
        <Ionicons name="chevron-forward" size={20} color={iconColor} />
      </XStack>
    </Card>
  );
});

export default function Profile() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const { removePersistData } = useDataPersist();

  const insets = useSafeAreaInsets();
  const avatarSize = windowWidth < 375 ? 100 : 120;
  // Use theme-aware background with light mode default fallback (#FFFFFF)
  const bgColor = getThemeColor(theme, 'background', '#FFFFFF');
  const scrollPaddingBottom = 80 + insets.bottom;

  const formatMemberSince = useCallback((dateString?: string): string => {
    if (!dateString) return '–';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '–';
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (err) {
      return '–';
    }
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert('Keluar', 'Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await removePersistData(DataPersistKeys.USER);
          await authSignOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }, [removePersistData, router]);

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>
        <YStack
          flex={1}
          padding="$5"
          paddingBottom="$10"
          alignItems="center"
          justifyContent="center"
          accessibilityLabel="Memuat profil"
          accessibilityLiveRegion="polite">
          <Spinner size="large" color="$primary" />
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: scrollPaddingBottom,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}>
        {/* Avatar, Nama lengkap, Bergabung */}
        <YStack alignItems="center" marginBottom="$5" space="$3" accessibilityLabel="Foto profil">
          <Avatar
            avatarUrl={user.avatar_url}
            name={user.full_name || user.name || user.email}
            size={avatarSize}
            editable={false}
          />
          {/* Nama lengkap di bawah avatar */}
          <Text
            fontSize="$6"
            fontWeight="700"
            color="$color"
            fontFamily="$heading"
            textAlign="center">
            {user.full_name || user.name || 'Pengguna'}
          </Text>
          {/* Bergabung dengan badge */}
          {user.created_at && (
            <XStack
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius="$10"
              backgroundColor="$backgroundHover"
              borderWidth={1}
              borderColor="$primary">
              <Text fontSize="$3" fontWeight="600" color="$primary">
                Bergabung {formatMemberSince(user.created_at)}
              </Text>
            </XStack>
          )}
        </YStack>

        {/* Menu items */}
        <MenuItem
          label="Profile Saya"
          icon="person-outline"
          onPress={() => router.push('/(main)/(tabs)/profile/edit-profile')}
          accessibilityLabel="Profile Saya"
          accessibilityHint="Edit informasi profil Anda"
        />
        <MenuItem
          label="Alamat"
          icon="location-outline"
          onPress={() => router.push('/(main)/(tabs)/profile/addresses')}
          accessibilityLabel="Alamat pengiriman"
          accessibilityHint="Kelola alamat pengiriman Anda"
        />
        <MenuItem
          label="Dukungan"
          icon="help-circle-outline"
          onPress={() => router.push('/(main)/(tabs)/profile/support')}
          accessibilityLabel="Dukungan"
          accessibilityHint="Hubungi tim dukungan"
        />

        {/* Sign Out - red button, full-width touch target ≥44px */}
        <Card
          marginTop="$5"
          marginBottom="$2"
          padding="$4"
          backgroundColor="transparent"
          borderWidth={0}
          elevation={0}
          pressStyle={{ opacity: 0.85 }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleLogout();
          }}
          accessibilityLabel="Keluar dari akun"
          accessibilityHint="Keluar dari aplikasi dan kembali ke halaman login">
          <Text fontSize="$5" color="$danger" fontWeight="600" textAlign="center">
            Keluar
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
