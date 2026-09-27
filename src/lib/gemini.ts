/**
 * ============================================================================
 * JobMate Core - Google Gemini Client [LEGACY / UNUSED] (src/lib/gemini.ts)
 * ============================================================================
 * หมายเหตุ:
 * ไฟล์นี้เป็นตัวเชื่อมต่อ Google Gemini SDK ตัวเดิม ปัจจุบันระบบเปลี่ยนไปใช้
 * OpenRouter Client (src/lib/openrouter.ts) เป็นหลักแล้ว จึงไม่ได้ถูกเรียกใช้งาน
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AQ.Ab8RN6KD--DPcMpAMX1xC6oN5L5I8030155p1K7Ze9R86ePWZg");

export const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});