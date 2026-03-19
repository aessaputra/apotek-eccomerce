import React, { useRef, memo, useEffect } from 'react';
import { ScrollView } from 'react-native';
import RNBottomSheet, {
  BottomSheetProps as RNBottomSheetProps,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { YStack } from 'tamagui';
import { isWeb } from '@/utils/deviceInfo';

export interface BottomSheetProps extends RNBottomSheetProps {
  isOpen: boolean;
  initialOpen?: boolean;
  children: React.ReactNode;
}

const BottomSheet = memo(function BottomSheet({
  isOpen,
  initialOpen,
  children,
  ...others
}: BottomSheetProps) {
  const bottomSheetRef = useRef<RNBottomSheet>(null);

  useEffect(() => {
    if (!isWeb) {
      if (isOpen) bottomSheetRef.current?.snapToIndex(0);
      else bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const renderBackdropComponent = (backdropProps: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...backdropProps} disappearsOnIndex={-1} />
  );

  // Web fallback implementation
  if (isWeb) {
    if (!isOpen) return null;
    return (
      <>
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="$sheetOverlay"
          zIndex={999}
        />
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          backgroundColor="$background"
          borderTopLeftRadius={16}
          borderTopRightRadius={16}
          maxHeight="80%"
          zIndex={1000}
          flex={1}
          width="100%">
          <ScrollView
            contentContainerStyle={{ width: '100%' }}
            style={{ flex: 1, width: '100%' }}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </YStack>
      </>
    );
  }

  // Native implementation
  return (
    <RNBottomSheet
      ref={bottomSheetRef}
      animateOnMount
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdropComponent}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      index={initialOpen ? 0 : -1}
      {...others}>
      <BottomSheetScrollView
        contentContainerStyle={{ width: '100%' }}
        style={{ flex: 1, width: '100%' }}>
        {children}
      </BottomSheetScrollView>
    </RNBottomSheet>
  );
});

export default BottomSheet;
