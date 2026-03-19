import { type ComponentType, useCallback, memo, useState } from 'react';
import { ScrollView, Platform, Dimensions } from 'react-native';
import { YStack, XStack, Text, useTheme, Card, Spinner, styled } from 'tamagui';
import { useRouter } from 'expo-router';
import { SafeAreaView as RNSafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Avatar from '@/components/elements/Avatar';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import { useAppSlice } from '@/slices';
import { useDataPersist, DataPersistKeys } from '@/hooks';
import { signOut as authSignOut } from '@/services/auth.service';
import { getThemeColor } from '@/utils/theme';
import {
  ChevronRightIcon,
  CircleHelpIcon,
  MapPinIcon,
  UserIcon,
  type IconProps,
} from '@/components/icons';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

interface MenuItemProps {
  label: string;
  icon: ComponentType<IconProps>;
  onPress: () => void;
  'aria-label': string;
  'aria-describedby': string;
}

const MenuItem = memo(function MenuItem({
  label,
  icon: Icon,
  onPress,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: MenuItemProps) {
  const theme = useTheme();
  const iconColor = getThemeColor(theme, 'colorPress');

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
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}>
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$3" flex={1}>
          <Icon size={22} color={iconColor} />
          <Text fontSize="$4" color="$color" fontWeight="500">
            {label}
          </Text>
        </XStack>
        <ChevronRightIcon size={20} color={iconColor} />
      </XStack>
    </Card>
  );
});

export default function Profile() {
  const router = useRouter();
  const { user } = useAppSlice();
  const { removePersistData } = useDataPersist();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const insets = useSafeAreaInsets();
  const avatarSize = Dimensions.get('window').width < 375 ? 100 : 120;
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
    } catch {
      return '–';
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await removePersistData(DataPersistKeys.USER);
      await authSignOut();
    } catch (error) {
      if (__DEV__) {
        console.error('Logout error:', error);
      }
    } finally {
      router.replace('/(auth)/login');
    }
  }, [removePersistData, router]);

  if (!user) {
    return (
      <SafeAreaView edges={['top']}>
        <YStack
          flex={1}
          padding="$5"
          paddingBottom="$10"
          alignItems="center"
          justifyContent="center"
          aria-label="Memuat profil"
          accessibilityLiveRegion="polite">
          <Spinner size="large" color="$primary" />
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: scrollPaddingBottom,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}>
        {/* Avatar, Nama lengkap, Bergabung */}
        <YStack alignItems="center" marginBottom="$5" gap="$3" aria-label="Foto profil">
          <Avatar
            avatarUrl={user.avatar_url}
            name={user.full_name || user.name || user.email}
            size={avatarSize}
            editable={false}
          />
          {/* Nama lengkap di bawah avatar */}
          <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
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
          icon={UserIcon}
          onPress={() => router.push('/profile/edit-profile')}
          aria-label="Profile Saya"
          aria-describedby="Edit informasi profil Anda"
        />
        <MenuItem
          label="Alamat"
          icon={MapPinIcon}
          onPress={() => router.push('/profile/addresses')}
          aria-label="Alamat pengiriman"
          aria-describedby="Kelola alamat pengiriman Anda"
        />
        <MenuItem
          label="Dukungan"
          icon={CircleHelpIcon}
          onPress={() => router.push('/profile/support')}
          aria-label="Dukungan"
          aria-describedby="Hubungi tim dukungan"
        />

        {/* Sign Out - red button, full-width touch target ≥44px */}
        <Card
          marginTop="$5"
          marginBottom="$2"
          padding="$4"
          backgroundColor="transparent"
          borderWidth={1}
          borderColor="$danger"
          borderRadius="$4"
          elevation={0}
          pressStyle={{ opacity: 0.85 }}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setLogoutDialogOpen(true);
          }}
          {...(Platform.OS === 'web' ? { style: { cursor: 'pointer' } } : {})}
          aria-label="Keluar dari akun"
          aria-describedby="Keluar dari aplikasi dan kembali ke halaman login">
          <Text fontSize="$5" color="$danger" fontWeight="600" textAlign="center">
            Keluar
          </Text>
        </Card>

        {/* Logout confirmation dialog */}
        <AppAlertDialog
          open={logoutDialogOpen}
          onOpenChange={setLogoutDialogOpen}
          title="Keluar"
          description="Anda yakin ingin keluar?"
          cancelText="Batal"
          confirmText="Keluar"
          confirmColor="$danger"
          onConfirm={handleLogout}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
