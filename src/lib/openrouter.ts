export const model = {
  startChat: (config: { history: any[] }) => {
    let history = [...config.history];
    return {
      sendMessage: async (message: string) => {
        history.push({ role: "user", content: message });

        // แทนที่ด้วย API Key ของคุณโดยตรงเพื่อทดสอบ (ห้ามใช้ process.env ในตอนนี้)
        const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`,
            "HTTP-Referer": "https://localhost:8081",
            "X-Title": "JobMateApp"
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            messages: history,
            max_tokens: 1000,
          }),
        });

        const data = await response.json();

        // ตรวจสอบโครงสร้างข้อมูลที่ได้รับ
        if (!data.choices || data.choices.length === 0) {
          console.error("OpenRouter Response Error:", JSON.stringify(data, null, 2));
          throw new Error(data.error?.message || "Unknown API Error");
        }

        const aiText = data.choices[0].message.content;
        history.push({ role: "assistant", content: aiText });

        return {
          response: {
            text: () => aiText
          }
        };
      }
    };
  }
};