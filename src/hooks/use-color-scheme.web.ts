/**
 * ============================================================================
 * JobMate Hooks - Web Color Scheme Hook (src/hooks/use-color-scheme.web.ts)
 * ============================================================================
 * Hook จัดการ Color Scheme สำหรับ Expo Web:
 * ป้องกันปัญหา SSR / Hydration Mismatch โดยเริ่มที่ 'light' ก่อนที่ Client จะ Hydrate เสร็จ
 */

import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * ดึงสถานะ Color Scheme ปัจจุบันบน Web Browser
 *
 * @returns {'light' | 'dark' | null | undefined} ค่าชุดสีปัจจุบัน
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
