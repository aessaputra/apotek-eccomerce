import { Dimensions, Platform } from 'react-native';

export const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

export const isIos = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export const isWeb = Platform.OS === 'web';
export const isMobile = isIos || isAndroid;
