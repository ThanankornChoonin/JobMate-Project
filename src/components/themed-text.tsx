/**
 * ============================================================================
 * JobMate Components - Themed Text (src/components/themed-text.tsx)
 * ============================================================================
 * คอมโพเนนต์ Text พื้นฐานที่ปรับสีและฟอนต์ตามธีม (Light / Dark) อัตโนมัติ:
 * รองรับหลายรูปแบบข้อความ (Typography Types):
 * - default: ข้อความทั่วไป (16px)
 * - title: หัวเรื่องหลักขนาดใหญ่ (48px)
 * - subtitle: หัวเรื่องรอง (32px)
 * - small: ข้อความขนาดเล็ก (14px)
 * - smallBold: ข้อความขนาดเล็กตัวหนา (14px Bold)
 * - link / linkPrimary: ข้อความลิงก์
 * - code: ข้อความฟอนต์ Monospace สำหรับโค้ด
 */

import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

/**
 * ThemedText Component
 */
export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  title: {
    fontSize: 48,
    fontWeight: '600',
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: '600',
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});
