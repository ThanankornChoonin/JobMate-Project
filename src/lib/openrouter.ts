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
            model: "google/gemini-2.5-flash-lite",
            messages: history,
            max_tokens: 1000,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.choices || data.choices.length === 0) {
          console.error("OpenRouter Response Error:", JSON.stringify(data, null, 2));
          throw new Error(
            data.error?.message || `OpenRouter request failed (${response.status})`
          );
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