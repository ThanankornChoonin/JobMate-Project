/**
 * Backend AI Engine Configuration
 * จัดการการอ่านและบันทึกการตั้งค่า AI Engine (Cloud vs Local LLM) สำหรับ Backend
 */

const fs = require("fs");
const path = require("path");

const CONFIG_FILE = path.join(__dirname, "ai-config.json");

const DEFAULT_CONFIG = {
  engine: "cloud", // 'cloud' | 'local'
  localUrl: "http://localhost:11434/v1",
  localModel: "qwen2.5:7b",
};

/**
 * ดึงค่าการตั้งค่า AI Engine
 */
function getAIConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.warn("[AI Config] Read config failed, using defaults:", err.message);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * บันทึกค่าการตั้งค่า AI Engine
 */
function saveAIConfig(newConfig) {
  try {
    const current = getAIConfig();
    const updated = { ...current, ...newConfig };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (err) {
    console.error("[AI Config] Save config failed:", err.message);
    throw err;
  }
}

module.exports = {
  getAIConfig,
  saveAIConfig,
  DEFAULT_CONFIG,
};
