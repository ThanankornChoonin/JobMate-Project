/**
 * ============================================================================
 * JobMate Hooks - Theme Hook (src/hooks/use-theme.ts)
 * ============================================================================
 * Hook สะดวกสำหรับเข้าถึง Object สีของโหมดปัจจุบัน (Light หรือ Dark)
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * ดึงชุดสีของธีมปัจจุบัน
 *
 * @returns Object สีที่ตรงกับ ColorScheme ปัจจุบัน (Colors.light หรือ Colors.dark)
 */
export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;

  return Colors[theme];
}
