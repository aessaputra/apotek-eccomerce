import { YStack, XStack, Text, Input, Card } from 'tamagui';
import { Platform, ScrollView, KeyboardAvoidingView, Pressable } from 'react-native';
import { SafeAreaView as RNSafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled } from 'tamagui';
import Button from '@/components/elements/Button';
import ErrorMessage from '@/components/elements/ErrorMessage';
import { useVerifyMfa } from './useVerifyMfa';
import { FORM_SCROLL_PADDING, PRIMARY_BUTTON_TITLE_STYLE, getCardShadow } from '@/constants/ui';
import { getThemeColor } from '@/utils/theme';
import { useMedia, useTheme } from 'tamagui';
import { useMemo } from 'react';

export default function VerifyMfa() {
  const media = useMedia();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mfa = useVerifyMfa();
  const scrollContentContainerStyle = useMemo(
    () => ({
      flexGrow: 1 as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingBottom: insets.bottom + FORM_SCROLL_PADDING.SPACIOUS + FORM_SCROLL_PADDING.COMPACT,
    }),
    [insets.bottom],
  );

  const showFactorSelection = mfa.factors.length > 1 && !mfa.selectedFactorId;

  return (
    <SafeAreaView edges={['top']}>
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        padding="$4">
        <KeyboardAvoidingWrapper
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={scrollContentContainerStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <YStack
              width="100%"
              maxWidth={media.gtMd ? 520 : media.gtSm ? 480 : 420}
              gap={media.gtSm ? '$6' : '$5'}>
              <YStack
                alignItems={media.gtSm ? 'flex-start' : 'center'}
                gap="$2"
                animation="quick"
                enterStyle={{ opacity: 0, y: -10 }}
                opacity={1}
                y={0}>
                <Text
                  fontSize={media.gtSm ? 32 : 28}
                  fontWeight="800"
                  letterSpacing={-0.8}
                  color="$color"
                  lineHeight={media.gtSm ? 38 : 34}
                  textAlign={media.gtSm ? 'left' : 'center'}>
                  Masukkan kode autentikator
                </Text>
                <Text
                  fontSize={15}
                  color="$colorHover"
                  lineHeight={22}
                  textAlign={media.gtSm ? 'left' : 'center'}>
                  Buka aplikasi autentikator, lalu masukkan 6 digit kode untuk melanjutkan masuk.
                </Text>
              </YStack>

              <YStack
                borderRadius={20}
                paddingVertical={media.gtMd ? 36 : media.gtSm ? 32 : 28}
                paddingHorizontal={media.gtMd ? 40 : media.gtSm ? 32 : 24}
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$borderColorHover"
                elevation={4}
                {...getCardShadow(getThemeColor(theme, 'shadowColor'))}
                gap={media.gtSm ? '$5' : '$4'}
                animation="quick"
                enterStyle={{ opacity: 0, y: 20 }}
                opacity={1}
                y={0}>
                <ErrorMessage message={mfa.error} onDismiss={mfa.dismissError} dismissible={true} />

                {showFactorSelection ? (
                  <YStack gap="$3">
                    <Text fontSize={15} fontWeight="700" color="$color">
                      Pilih aplikasi autentikator
                    </Text>
                    <Text fontSize={13} color="$colorPress" lineHeight={19}>
                      Pilih salah satu aplikasi yang terhubung ke akun Anda.
                    </Text>
                    {mfa.factors.map(factor => (
                      <Button
                        key={factor.id}
                        title={factor.type === 'totp' ? 'Aplikasi Autentikator' : factor.type}
                        onPress={() => mfa.handleSelectFactor(factor.id)}
                        backgroundColor="$primary"
                        titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
                      />
                    ))}
                  </YStack>
                ) : (
                  <YStack gap="$4">
                    <Card
                      padding={media.gtSm ? '$4' : '$3'}
                      borderRadius="$5"
                      borderWidth={1}
                      borderColor="$surfaceBorder"
                      backgroundColor="$background">
                      <YStack gap="$2">
                        <Text fontSize={14} fontWeight="700" color="$color">
                          Kode 6 digit
                        </Text>
                        <Text fontSize={13} color="$colorPress" lineHeight={19}>
                          Masukkan kode terbaru sebelum waktunya habis.
                        </Text>
                        <Input
                          value={mfa.code}
                          onChangeText={mfa.handleCodeChange}
                          placeholder="000000"
                          keyboardType="number-pad"
                          maxLength={6}
                          textAlign="center"
                          textAlignVertical="center"
                          fontSize={media.gtSm ? 28 : 24}
                          lineHeight={media.gtSm ? 34 : 30}
                          fontWeight="800"
                          paddingHorizontal={0}
                          paddingVertical={0}
                          height={media.gtSm ? 64 : 58}
                          borderRadius="$4"
                          borderColor="$surfaceBorder"
                          backgroundColor="$surface"
                          aria-label="Kode verifikasi"
                          editable={!mfa.loading}
                          returnKeyType="done"
                          submitBehavior="blurAndSubmit"
                          onSubmitEditing={mfa.handleSubmit}
                        />
                      </YStack>
                    </Card>

                    <YStack gap="$2">
                      <Text fontSize={12} color="$colorSubtle" lineHeight={17} textAlign="center">
                        Jangan bagikan kode ini kepada siapa pun, termasuk pihak yang mengaku dari
                        Apotek.
                      </Text>
                    </YStack>

                    <Button
                      title="Lanjutkan"
                      aria-label="Lanjutkan verifikasi"
                      paddingVertical={16}
                      borderRadius={14}
                      height={56}
                      backgroundColor="$primary"
                      titleStyle={{
                        ...PRIMARY_BUTTON_TITLE_STYLE,
                        fontSize: 17,
                        fontWeight: '700',
                        letterSpacing: 0.3,
                      }}
                      onPress={mfa.handleSubmit}
                      isLoading={mfa.loading}
                      loaderColor="$onPrimary"
                      disabled={mfa.loading || mfa.code.trim().length === 0}
                      animation="quick"
                      hoverStyle={{ backgroundColor: '$primary', scale: 1.02 }}
                      pressStyle={{ scale: 0.98 }}
                    />
                  </YStack>
                )}

                <XStack justifyContent="center" paddingTop="$1">
                  <Pressable onPress={mfa.handleCancel} aria-label="Kembali ke login" role="button">
                    <Text
                      fontSize={14}
                      fontWeight="700"
                      color="$primary"
                      textDecorationLine="underline">
                      Gunakan akun lain
                    </Text>
                  </Pressable>
                </XStack>
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingWrapper>
      </YStack>
    </SafeAreaView>
  );
}

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
});

const KeyboardAvoidingWrapper = styled(KeyboardAvoidingView, {
  flex: 1,
  alignSelf: 'stretch',
});
