/**
 * ============================================================================
 * JobMate Components - External Link (src/components/external-link.tsx)
 * ============================================================================
 * คอมโพเนนต์สำหรับเปิด URL ภายนอก:
 * - บน Web: เปิดในแท็บใหม่ด้วย target="_blank"
 * - บน Native (iOS / Android): ป้องกัน default navigation แล้วเปิดผ่าน In-App Browser (expo-web-browser)
 */

import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

/**
 * ExternalLink Component
 * ใช้แทนแท็ก <a> ทั่วไป เพื่อเปิดหน้าต่างเบราว์เซอร์อย่างปลอดภัยทั้งบน Native และ Web
 */
export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== 'web') {
          // ป้องกัน default navigation บน native
          event.preventDefault();
          // เปิด URL ผ่าน in-app modal browser
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
    />
  );
}
