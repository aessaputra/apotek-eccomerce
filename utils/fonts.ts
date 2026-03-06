import { loadAsync } from 'expo-font';

export const fonts = {
  poppins: {
    regular: 'poppins_regular',
    regularItalic: 'poppins_regular_italic',
    semiBold: 'poppins_semiBold',
    semiBoldItalic: 'poppins_semiBold_italic',
    bold: 'poppins_bold',
    boldItalic: 'poppins_bold_italic',
  },
};

/** Preload font assets (Poppins). Panggil saat app init, mis. di root layout. */
export const loadFonts = () =>
  loadAsync({
    poppins_regular: require('@/assets/fonts/Poppins-Regular.ttf'),
    poppins_regular_italic: require('@/assets/fonts/Poppins-Italic.ttf'),
    poppins_semiBold: require('@/assets/fonts/Poppins-SemiBold.ttf'),
    poppins_semiBold_italic: require('@/assets/fonts/Poppins-SemiBoldItalic.ttf'),
    poppins_bold: require('@/assets/fonts/Poppins-Bold.ttf'),
    poppins_bold_italic: require('@/assets/fonts/Poppins-BoldItalic.ttf'),
  });
