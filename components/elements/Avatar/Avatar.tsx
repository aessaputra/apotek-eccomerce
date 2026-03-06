import { useState } from 'react';
import { TouchableOpacity, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { YStack, Text, useTheme } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import Image from '../Image';
import { getThemeColor } from '@/utils/theme';

export interface AvatarProps {
  /** URL gambar avatar, atau null jika belum ada */
  avatarUrl: string | null;
  /** Nama lengkap atau email untuk fallback initial */
  name: string;
  /** Ukuran avatar dalam pixel */
  size?: number;
  /** Callback ketika avatar di-upload */
  onUpload?: (uri: string) => Promise<void>;
  /** Apakah avatar bisa di-edit */
  editable?: boolean;
  /** Loading state untuk upload */
  uploading?: boolean;
}

/**
 * Avatar component dengan kemampuan upload gambar.
 * Menampilkan gambar jika ada, atau initial dari nama jika tidak ada.
 */
export default function Avatar({
  avatarUrl,
  name,
  size = 100,
  onUpload,
  editable = false,
  uploading = false,
}: AvatarProps) {
  const theme = useTheme();
  const [localUri, setLocalUri] = useState<string | null>(null);

  const primaryColor = getThemeColor(theme, 'primary');
  // Use theme-aware background with light mode default fallback (#FFFFFF)
  const bgColor = getThemeColor(theme, 'background');
  const borderColor = getThemeColor(theme, 'borderColor');

  // Generate initial dari nama
  const getInitials = (fullName: string): string => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  const handleImagePick = async () => {
    if (!editable || uploading) return;

    // Request permissions
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Izin Diperlukan',
          'Aplikasi memerlukan akses ke galeri foto untuk mengubah foto profil.',
        );
        return;
      }
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setLocalUri(uri);
      if (onUpload) {
        try {
          await onUpload(uri);
          setLocalUri(null);
        } catch {
          setLocalUri(null);
          Alert.alert('Error', 'Gagal mengupload foto profil. Silakan coba lagi.');
        }
      }
    }
  };

  const displayUri = localUri || avatarUrl;
  const showInitials = !displayUri;

  return (
    <TouchableOpacity
      onPress={editable ? handleImagePick : undefined}
      disabled={!editable || uploading}
      activeOpacity={editable ? 0.8 : 1}
      style={{ alignSelf: 'center' }}>
      <YStack
        width={size}
        height={size}
        borderRadius={size / 2}
        overflow="hidden"
        alignItems="center"
        justifyContent="center"
        backgroundColor={showInitials ? primaryColor : 'transparent'}
        borderWidth={3}
        borderColor={borderColor}
        position="relative">
        {/* Gradient border untuk visual enhancement */}
        {editable && (
          <LinearGradient
            colors={[primaryColor, `${primaryColor}80`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              width: size + 6,
              height: size + 6,
              borderRadius: (size + 6) / 2,
              top: -3,
              left: -3,
              zIndex: -1,
            }}
          />
        )}

        {displayUri ? (
          <Image
            source={{ uri: displayUri }}
            style={{
              width: size - 6,
              height: size - 6,
              borderRadius: (size - 6) / 2,
            }}
            contentFit="cover"
          />
        ) : (
          <Text fontSize={size * 0.35} fontWeight="600" color={bgColor} fontFamily="$heading">
            {initials}
          </Text>
        )}

        {/* Edit overlay */}
        {editable && (
          <YStack
            position="absolute"
            bottom={0}
            right={0}
            width={size * 0.35}
            height={size * 0.35}
            borderRadius={size * 0.175}
            backgroundColor={primaryColor}
            alignItems="center"
            justifyContent="center"
            borderWidth={2}
            borderColor={bgColor}>
            {uploading ? (
              <Text fontSize={size * 0.2} color={bgColor}>
                ...
              </Text>
            ) : (
              <Text fontSize={size * 0.2} color={bgColor}>
                ✎
              </Text>
            )}
          </YStack>
        )}
      </YStack>
    </TouchableOpacity>
  );
}
