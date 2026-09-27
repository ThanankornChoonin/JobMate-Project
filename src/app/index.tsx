/**
 * ============================================================================
 * JobMate App - Entry Point (src/app/index.tsx)
 * ============================================================================
 * หน้าจอเริ่มต้นของแอป ทำการ Redirect ผู้ใช้ไปยังหน้าเข้าสู่ระบบ (/login) อัตโนมัติ
 */

import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/login" />;
}