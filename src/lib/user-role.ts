/**
 * ============================================================================
 * JobMate Core - User Role Helper (src/lib/user-role.ts)
 * ============================================================================
 * ตรวจสอบบทบาท (Role) ของผู้ใช้งานปัจจุบันที่ล็อกอินอยู่:
 * - 'candidate': ผู้สมัครงานทั่วไป (สามารถเข้าหน้า /home, ยื่น CV, สัมภาษณ์ AI)
 * - 'hr' หรือ 'admin': เจ้าหน้าที่ฝ่ายบุคคล (สามารถเข้าหน้า /hr-dashboard, จัดการสถานะผู้สมัคร)
 */

import { supabase } from "./supabase";

/**
 * ประเภทของบทบาทผู้ใช้งานในระบบ
 */
export type UserRole = "candidate" | "hr" | "admin";

/**
 * ดึงข้อมูลบทบาทของผู้ใช้งานที่กำลังล็อกอินอยู่ในปัจจุบัน
 * 
 * ขั้นตอนการทำงาน:
 * 1. ดึง user object จาก Supabase Auth Session
 * 2. หากยังไม่ได้เข้าสู่ระบบ จะคืนค่าเริ่มต้นเป็น 'candidate'
 * 3. ดึงฟิลด์ 'role' จากตาราง 'profiles' ของผู้ใช้นั้น
 * 4. หาก role เป็น 'hr' หรือ 'admin' จะคืนค่า role นั้น มิฉะนั้นจะคืน 'candidate'
 *
 * @returns {Promise<UserRole>} บทบาทของผู้ใช้งาน ('candidate', 'hr', หรือ 'admin')
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // หากไม่มีผู้ใช้ล็อกอิน ให้ถือเป็น candidate เริ่มต้น
  if (!user) return "candidate";

  // ดึงบทบาทจากตาราง profiles
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // กรณีเกิด error หรือยังไม่มี record ให้ fallback เป็น candidate เพื่อความปลอดภัย
  if (error || !data) return "candidate";

  return data.role === "hr" || data.role === "admin" ? data.role : "candidate";
}
