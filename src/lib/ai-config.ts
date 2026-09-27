/**
 * ============================================================================
 * JobMate Core - AI Engine Configuration (src/lib/ai-config.ts)
 * ============================================================================
 * จัดการการสลับใช้งานระหว่าง Cloud AI (OpenRouter) กับ Local LLM (Ollama / LM Studio):
 * 1. บันทึกและอ่านการตั้งค่าโมเดล AI ผ่าน AsyncStorage
 * 2. ตรวจสอบและทดสอบการเชื่อมต่อกับ Local LLM Server (Ollama / LM Studio)
 * 3. มีค่าเริ่มต้นที่ปลอดภัย (Default: Cloud AI) เพื่อให้แอปทำงานได้เสมอ
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export type AIEngineType = "cloud" | "local";

export interface AIEngineConfig {
  engine: AIEngineType;
  localUrl: string;
  localModel: string;
}

const STORAGE_KEY = "@jobmate_ai_engine_config";

export const DEFAULT_AI_CONFIG: AIEngineConfig = {
  engine: "cloud",
  localUrl: "http://localhost:11434/v1",
  localModel: "qwen2.5:7b",
};

/**
 * ดึงการตั้งค่าโมเดล AI ปัจจุบันจาก Local Storage
 */
export async function getAIConfig(): Promise<AIEngineConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      engine: parsed.engine === "local" ? "local" : "cloud",
      localUrl: parsed.localUrl || DEFAULT_AI_CONFIG.localUrl,
      localModel: parsed.localModel || DEFAULT_AI_CONFIG.localModel,
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

/**
 * บันทึกการตั้งค่าโมเดล AI ใหม่
 */
export async function saveAIConfig(
  newConfig: Partial<AIEngineConfig>
): Promise<AIEngineConfig> {
  try {
    const current = await getAIConfig();
    const updated: AIEngineConfig = {
      ...current,
      ...newConfig,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("ไม่สามารถบันทึกการตั้งค่า AI ได้:", err);
    return DEFAULT_AI_CONFIG;
  }
}

/**
 * ทดสอบการเชื่อมต่อกับ Local LLM Server (เช่น Ollama หรือ LM Studio)
 * เรียก Endpoint /models เพื่อตรวจสอบว่า Server เปิดอยู่และมีโมเดลอะไรบ้าง
 */
export async function testLocalAIConnection(url?: string): Promise<{
  success: boolean;
  models: string[];
  error?: string;
}> {
  const targetUrl = (url || DEFAULT_AI_CONFIG.localUrl).replace(/\/+$/, "");
  const endpoint = targetUrl.endsWith("/v1")
    ? `${targetUrl}/models`
    : `${targetUrl}/v1/models`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // รอไม่เกิน 4 วินาที

    const res = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        models: [],
        error: `Server ตอบกลับด้วยรหัส: ${res.status} (${res.statusText})`,
      };
    }

    const data = await res.json();
    let modelNames: string[] = [];

    if (Array.isArray(data?.data)) {
      modelNames = data.data.map((m: any) => m.id || m.name).filter(Boolean);
    } else if (Array.isArray(data?.models)) {
      modelNames = data.models.map((m: any) => m.name || m.id).filter(Boolean);
    }

    return {
      success: true,
      models: modelNames,
    };
  } catch (err: any) {
    let msg = "ไม่สามารถเชื่อมต่อ Local LLM ได้";
    if (err.name === "AbortError") {
      msg = "การเชื่อมต่อหมดเวลา (Timeout) กรุณาตรวจสอบว่า Ollama/LM Studio เปิดอยู่";
    } else if (err.message) {
      msg = err.message;
    }
    return {
      success: false,
      models: [],
      error: msg,
    };
  }
}
