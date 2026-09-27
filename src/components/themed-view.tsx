/**
 * ============================================================================
 * JobMate Components - Themed View (src/components/themed-view.tsx)
 * ============================================================================
 * คอนเทนเนอร์ View พื้นฐานที่ปรับสีพื้นหลังตามโหมดธีมปัจจุบัน (Light/Dark) อัตโนมัติ
 */

import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

/**
 * ThemedView Component
 */
export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps} />;
}
