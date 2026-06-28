import { useState, useEffect } from 'react';
import { Linking, Platform, View } from 'react-native';
import { YStack, XStack, Text, Card, styled, ScrollView, useTheme } from 'tamagui';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { getThemeColor } from '@/utils/theme';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient, Stop, G, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
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
const AnimatedG = Animated.createAnimatedComponent(G);

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

const OPNFORM_URL = 'https://opnform.com/forms/formulir-umpan-balik-bantuan-sinar-farma-qohroj';
const SUPPORT_EMAIL = 'support@sinarfarma.biz.id';

function SupportHeroAnimation() {
  const theme = useTheme();
  const primaryColor = getThemeColor(theme, 'primary');

  const pulse = useSharedValue(0);
  const rotate = useSharedValue(0);
  const float1 = useSharedValue(0);
  const float2 = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: 15000, easing: Easing.linear }),
      -1,
      false,
    );
    float1.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    float2.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  const blobProps = useAnimatedProps(() => ({
    rotation: rotate.value,
  }));

  const pulseRing1 = useAnimatedProps(() => ({
    r: interpolate(pulse.value, [0, 1], [60, 85]),
    opacity: interpolate(pulse.value, [0, 1], [0.6, 0]),
  }));

  const pulseRing2 = useAnimatedProps(() => ({
    r: interpolate(pulse.value, [0, 1], [70, 100]),
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0]),
  }));

  const floatStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float1.value, [0, 1], [-6, 6]) }],
  }));

  const floatStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float2.value, [0, 1], [8, -8]) }],
  }));

  return (
    <YStack alignItems="center" justifyContent="center" height={180} width="100%">
      {/* Background SVG Animation */}
      <View style={{ position: 'absolute' }}>
        <Svg width={240} height={240} viewBox="0 0 240 240">
          <Defs>
            <LinearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.15" />
              <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>

          <G x="120" y="120">
            {/* Pulsing rings */}
            <AnimatedCircle fill={primaryColor} animatedProps={pulseRing1} />
            <AnimatedCircle fill={primaryColor} animatedProps={pulseRing2} />

            {/* Slowly rotating blob */}
            <AnimatedG animatedProps={blobProps}>
              <Path
                d="M 45 -55 C 65 -35 75 -10 65 15 C 55 40 30 55 5 60 C -20 65 -45 50 -60 25 C -75 0 -70 -35 -50 -55 C -30 -75 25 -75 45 -55 Z"
                fill="url(#blobGrad)"
              />
              <Path
                d="M -30 -45 C -10 -65 20 -70 45 -50 C 70 -30 75 10 55 35 C 35 60 -10 70 -35 50 C -60 30 -50 -25 -30 -45 Z"
                fill={primaryColor}
                opacity={0.08}
              />
            </AnimatedG>
            <Circle r="48" fill={primaryColor} opacity={0.1} />
          </G>
        </Svg>
      </View>

      {/* Floating Foreground: Main Icon */}
      <Animated.View style={floatStyle1}>
        <YStack
          width={80}
          height={80}
          borderRadius={40}
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
          shadowColor="$primary"
          shadowOpacity={0.4}
          shadowRadius={15}
          shadowOffset={{ width: 0, height: 8 }}>
          <HeadsetIcon size={40} color="white" strokeWidth={1.5} />
        </YStack>
      </Animated.View>

      {/* Floating Chat Bubble */}
      <Animated.View style={[{ position: 'absolute', right: '22%', top: '15%' }, floatStyle2]}>
        <YStack
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="$surface"
          alignItems="center"
          justifyContent="center"
          shadowColor="$shadowColor"
          shadowOpacity={0.15}
          shadowRadius={8}
          shadowOffset={{ width: 0, height: 4 }}
          borderWidth={1}
          borderColor="$surfaceBorder">
          <MessageSquareIcon size={18} color="$primary" strokeWidth={2} />
        </YStack>
      </Animated.View>

      {/* Floating Mail Icon */}
      <Animated.View style={[{ position: 'absolute', left: '22%', bottom: '20%' }, floatStyle2]}>
        <YStack
          width={32}
          height={32}
          borderRadius={16}
          backgroundColor="$surface"
          alignItems="center"
          justifyContent="center"
          shadowColor="$shadowColor"
          shadowOpacity={0.15}
          shadowRadius={8}
          shadowOffset={{ width: 0, height: 4 }}
          borderWidth={1}
          borderColor="$surfaceBorder">
          <MailIcon size={16} color="$colorHover" strokeWidth={2} />
        </YStack>
      </Animated.View>
    </YStack>
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
          <SupportHeroAnimation />
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
                  <Text
                    fontSize="$4"
                    fontWeight="600"
                    color="$color"
                    numberOfLines={1}
                    adjustsFontSizeToFit>
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
