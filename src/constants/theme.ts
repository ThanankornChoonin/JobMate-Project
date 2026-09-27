/**
 * ============================================================================
 * JobMate Design - Theme, Fonts & Spacing (src/constants/theme.ts)
 * ============================================================================
 * กำหนดค่าชุดสี Light/Dark mode, แบบอักษรตามแพลตฟอร์ม, ระยะห่าง (Spacing),
 * และค่าคงที่สำหรับ Inset ของหน้าจอ
 */

import '@/global.css';
import { Platform } from 'react-native';

/**
 * ชุดสีสำหรับโหมดสว่าง (Light) และโหมดมืด (Dark)
 */
export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * กำหนด Font Family ตามแพลตฟอร์ม (iOS, Android/Default, Web)
 */
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * ระยะห่างมาตรฐาน (Spacing Scale) ในหน่วยพิกเซล
 */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * ระยะ Inset ด้านล่างสำหรับ Tab Bar บนอุปกรณ์มือถือ
 */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/**
 * ความกว้างสูงสุดของคอนเทนต์ในจอใหญ่ (Web / Tablet)
 */
export const MaxContentWidth = 800;
