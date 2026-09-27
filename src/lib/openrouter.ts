/**
 * ============================================================================
 * JobMate Core - OpenRouter AI Chat Client (src/lib/openrouter.ts)
 * ============================================================================
 * ตัวเชื่อมต่อ AI Chat Client สำหรับการโต้ตอบในหน้าสัมภาษณ์ AI (src/app/interview.tsx):
 * 1. จำลองอินเทอร์เฟซแบบ Chat Session คล้าย Gemini SDK (startChat & sendMessage)
 * 2. รักษาประวัติการสนทนา (Conversation History)
 * 3. มีระบบ Auto-Fallback ลองโมเดลถัดไปอัตโนมัติหากโมเดลปัจจุบันล้มเหลว
 */

import { getAIConfig } from "./ai-config";

export const model = {
  /**
   * เริ่มต้นเซสชันการสนทนากับ AI
   *
   * @param config - การตั้งค่าเริ่มต้น เช่น { history: [] }
   * @returns ออบเจกต์ที่มีเมธอด sendMessage สำหรับส่งข้อความและรับคำตอบ
   */
  startChat: (config: { history: any[] }) => {
    let history = [...config.history];

    // รายชื่อโมเดล AI ที่รองรับใน OpenRouter เรียงตามลำดับความสำคัญ
    const models = [
      "openai/gpt-5.6-sol-pro",
      "nex-agi/nex-n2.5-pro:free",
      "nex-agi/nex-n2.5-mini:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "google/gemma-4-31b-it:free",
      "google/gemma-4-26b-a4b-it:free",
      "nvidia/nemotron-3.5-lightning:free",
      "liquid/lfm-2.5-2.6b:free",
    ];

    return {
      /**
       * ส่งข้อความไปยัง AI และรับคำตอบกลับมา
       *
       * @param message - ข้อความที่ผู้ใช้หรือระบบส่งให้ AI
       * @returns {Promise<{ response: { text: () => string } }>} ผลลัพธ์ข้อความจาก AI
       */
      sendMessage: async (message: string) => {
        // เพิ่มข้อความของผู้ใช้ลงในประวัติ
        history.push({ role: "user", content: message });

        // อ่านการตั้งค่า AI Engine ปัจจุบัน
        const aiConfig = await getAIConfig();

        // หากตั้งค่าเป็น Local LLM ให้ส่งไปยัง Local Server (Ollama / LM Studio)
        if (aiConfig.engine === "local") {
          const endpoint = `${aiConfig.localUrl.replace(/\/+$/, "")}/chat/completions`;
          const targetEndpoint = endpoint.includes("/v1")
            ? endpoint
            : `${aiConfig.localUrl.replace(/\/+$/, "")}/v1/chat/completions`;

          try {
            const response = await fetch(targetEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: aiConfig.localModel,
                messages: history,
                temperature: 0.2,
              }),
            });

            const data = await response.json();
            if (response.ok && data.choices?.length > 0) {
              const aiText = data.choices[0].message.content;
              history.push({ role: "assistant", content: aiText });
              return {
                response: {
                  text: () => aiText,
                },
              };
            }
            throw new Error(data.error?.message || `Local AI error (${response.status})`);
          } catch (localErr: any) {
            console.error("[Local LLM Error]", localErr);
            throw new Error(`ไม่สามารถเชื่อมต่อ Local LLM (${aiConfig.localModel}): ${localErr.message}`);
          }
        }

        const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
        let lastError = "OpenRouter request failed";

        // วนลูปทดลองทีละโมเดลตามลำดับ (Fallback Logic)
        for (const modelName of models) {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_KEY}`,
              "HTTP-Referer": "https://localhost:8081",
              "X-Title": "JobMateApp",
            },
            body: JSON.stringify({
              model: modelName,
              messages: history,
              max_tokens: 1500,
              temperature: 0.1,
            }),
          });

          const data = await response.json();

          // หากสำเร็จ นำคำตอบบันทึกเข้าประวัติและส่งกลับ
          if (response.ok && data.choices?.length > 0) {
            const aiText = data.choices[0].message.content;
            history.push({ role: "assistant", content: aiText });

            return {
              response: {
                text: () => aiText,
              },
            };
          }

          lastError = data.error?.message || `OpenRouter request failed (${response.status})`;
          console.error(`[AI Error] โมเดล ${modelName} ล้มเหลว:`, lastError);

          // หากเป็น Error 402 (Payment Required/Quota exhausted), 404, 429, 5xx ให้สลับไปลองโมเดลฟรีตัวถัดไป
          if (![402, 404, 429, 500, 502, 503, 504].includes(response.status)) {
            break;
          }
        }

        throw new Error(lastError);
      },
    };
  },
};