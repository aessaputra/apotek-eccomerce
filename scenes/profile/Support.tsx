import { useState, useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { YStack, XStack, Text, Card, styled, ScrollView } from 'tamagui';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  HeadsetIcon,
  MailIcon,
  MessageSquareIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckCircleIcon,
} from '@/components/icons';
import { copyTextToClipboard } from '@/utils/clipboard';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

const OPNFORM_URL = 'https://opnform.com/forms/formulir-umpan-balik-bantuan-sinar-farma-qohroj';
const SUPPORT_EMAIL = 'support@sinarfarma.biz.id';

function BreathingGlow() {
  const radius = useSharedValue(30);

  useEffect(() => {
    radius.value = withRepeat(
      withTiming(45, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    r: radius.value,
  }));

  return (
    <Svg width={100} height={100} style={{ position: 'absolute', top: -10 }}>
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <AnimatedCircle cx="50" cy="50" fill="url(#glow)" animatedProps={animatedProps} />
    </Svg>
  );
}

export default function SupportScreen() {
  const [copied, setCopied] = useState(false);

  const handleOpenForm = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await Linking.openURL(OPNFORM_URL);
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to open URL:', error);
      }
    }
  };

  const handleCopyEmail = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await copyTextToClipboard(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <SafeAreaView edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <YStack alignItems="center" gap="$4" marginTop="$4" marginBottom="$6">
          <BreathingGlow />
          <HeadsetIcon size={48} color="$primary" strokeWidth={1.5} />
          <YStack alignItems="center" gap="$2">
            <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
              Pusat Bantuan & Feedback Pelanggan
            </Text>
            <Text
              fontSize="$4"
              color="$colorPress"
              textAlign="center"
              paddingHorizontal="$4"
              lineHeight={22}>
              Kami siap membantu Anda. Silakan hubungi tim dukungan atau berikan masukan Anda.
            </Text>
          </YStack>
        </YStack>

        <YStack gap="$4">
          <Text
            fontSize="$3"
            fontWeight="600"
            color="$colorHover"
            textTransform="uppercase"
            letterSpacing={1}
            marginLeft="$2">
            Formulir Layanan
          </Text>

          {/* Primary Action Card for OpnForm */}
          <Card
            backgroundColor="$primary"
            borderRadius="$6"
            padding="$5"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
            animation="quick"
            onPress={handleOpenForm}
            elevation={4}
            shadowColor="$primary"
            shadowOpacity={0.3}
            shadowRadius={10}
            shadowOffset={{ width: 0, height: 4 }}
            {...(Platform.OS === 'web' ? { style: { cursor: 'pointer' } } : {})}>
            <XStack alignItems="center" justifyContent="space-between">
              <YStack flex={1} gap="$2" paddingRight="$4">
                <XStack alignItems="center" gap="$2">
                  <MessageSquareIcon size={24} color="white" />
                  <Text fontSize="$5" fontWeight="700" color="white">
                    Kirim Feedback
                  </Text>
                </XStack>
                <Text fontSize={13} color="white" opacity={0.9} lineHeight={18}>
                  Laporkan kendala pesanan, keluhan, atau berikan saran untuk perbaikan.
                </Text>
              </YStack>
              <YStack backgroundColor="rgba(255,255,255,0.2)" padding="$3" borderRadius={100}>
                <ExternalLinkIcon size={20} color="white" />
              </YStack>
            </XStack>
          </Card>

          <Text
            fontSize="$3"
            fontWeight="600"
            color="$colorHover"
            textTransform="uppercase"
            letterSpacing={1}
            marginLeft="$2"
            marginTop="$4">
            Kontak Langsung
          </Text>

          {/* Secondary Contact Cards */}
          <Card
            backgroundColor="$surface"
            borderRadius="$5"
            borderWidth={1}
            borderColor="$surfaceBorder"
            padding="$4"
            pressStyle={{ opacity: 0.85, backgroundColor: '$backgroundHover' }}
            onPress={handleCopyEmail}
            {...(Platform.OS === 'web' ? { style: { cursor: 'pointer' } } : {})}>
            <XStack alignItems="center" justifyContent="space-between" gap="$4">
              <XStack alignItems="center" gap="$4" flex={1}>
                <YStack
                  width={44}
                  height={44}
                  borderRadius={22}
                  backgroundColor="$backgroundHover"
                  alignItems="center"
                  justifyContent="center">
                  <MailIcon size={20} color="$primary" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$3" color="$colorPress" marginBottom="$1">
                    Email
                  </Text>
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    {SUPPORT_EMAIL}
                  </Text>
                </YStack>
              </XStack>
              {copied ? (
                <CheckCircleIcon size={20} color="$success" />
              ) : (
                <CopyIcon size={20} color="$colorHover" />
              )}
            </XStack>
          </Card>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
