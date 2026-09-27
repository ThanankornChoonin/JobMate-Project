/**
 * ============================================================================
 * JobMate App - Root Layout (src/app/_layout.tsx)
 * ============================================================================
 * เลย์เอาต์หลักระดับรากของแอปพลิเคชัน (Root Stack Navigator):
 * 1. ห่อหุ้มด้วย LanguageProvider เพื่อให้ทุกหน้าจอเข้าถึงระบบสองภาษาได้
 * 2. กำหนด Stack Navigator โดยซ่อน Header เริ่มต้น (headerShown: false)
 * 3. ลงทะเบียนหน้าจอทั้งหมดทั้งฝั่งผู้สมัคร (Candidate) และฝั่งฝ่ายบุคคล (HR)
 */

import { Stack } from "expo-router";
import { LanguageProvider } from "../context/language-context";

/**
 * RootLayout Component
 * โครงสร้างพื้นฐานระดับบนสุดของ Expo Router
 */
export default function RootLayout() {
  return (
    <LanguageProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* กลุ่มหน้าจอเริ่มต้นและระบบสมาชิก (Auth) */}
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />

        {/* กลุ่มหน้าจอหลักของผู้สมัครงาน (Candidate Flow) */}
        <Stack.Screen name="home" />
        <Stack.Screen name="select-position" />
        <Stack.Screen name="upload-cv" />
        <Stack.Screen name="cv-result" />
        <Stack.Screen name="interview" />
        <Stack.Screen name="result" />
        <Stack.Screen name="history" />
        <Stack.Screen name="history-detail" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />

        {/* กลุ่มหน้าจอสำหรับฝ่ายบุคคล (HR Portal) */}
        <Stack.Screen name="hr-dashboard" />
        <Stack.Screen name="candidate-profile" />
        <Stack.Screen name="candidate-management" />
        <Stack.Screen name="candidate-detail" />
      </Stack>
    </LanguageProvider>
  );
}
