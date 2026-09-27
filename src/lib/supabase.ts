/**
 * ============================================================================
 * JobMate Core - Supabase Client Configuration (src/lib/supabase.ts)
 * ============================================================================
 * กำหนดค่าและสร้าง Supabase Client สำหรับการเรียกใช้งานฝั่ง Frontend:
 * - เชื่อมต่อกับ Supabase Project
 * - ใช้ Anon Key สำหรับการตรวจสอบสิทธิ์ (Auth) และอ่าน/เขียนข้อมูลทั่วไป
 * - ใช้ AsyncStorage หรือ Memory Storage จัดเก็บ Auth Session อัตโนมัติ
 */

import { createClient } from "@supabase/supabase-js";

// ที่อยู่ URL และ Anon Key ของ Supabase Project
const supabaseUrl = "https://ktyladqcbwkbetwhpksp.supabase.co";
const supabaseAnonKey = "sb_publishable_8E18f-GHm4E7dxhqyCyG2A_gGtr6yxn";

/**
 * Supabase Client Instance
 * ใช้งานสำหรับการเข้าสู่ระบบ, ลงทะเบียน, ดึงข้อมูล และ Realtime Subscriptions
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);