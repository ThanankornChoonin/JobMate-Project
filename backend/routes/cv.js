/**
 * ============================================================================
 * JobMate Backend - CV & Interview Routes (backend/routes/cv.js)
 * ============================================================================
 * จัดการกระบวนการทำงานหลักของระบบ CV และการสัมภาษณ์:
 * 1. อัปโหลดและสกัดข้อความจากไฟล์ PDF CV
 * 2. ประเมิน CV ด้วย AI พร้อมสร้างชุดคำถามสัมภาษณ์เฉพาะบุคคล 5 ข้อในคำขอเดียว
 * 3. บันทึกและดึงข้อมูลผลการสัมภาษณ์ AI (interview_history)
 * 4. รวมกลุ่มข้อมูลผู้สมัครรายบุคคลสำหรับแดชบอร์ด HR (Grouped Candidates)
 * 5. อัปเดตสถานะการคัดเลือกของผู้สมัคร (Recruitment Status)
 */

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const router = express.Router();

// ==========================================
// 1. CLIENTS & STORAGE CONFIGURATION
// ==========================================

/**
 * Supabase Client (Service Role)
 * ใช้ SERVICE KEY สำหรับการดำเนินการในฝั่ง Backend เพื่อข้ามข้อจำกัด Row-Level Security (RLS)
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Multer Storage Configuration
 * ตั้งค่ารับไฟล์ PDF ขนาดสูงสุด 10MB และบันทึกชั่วคราวในโฟลเดอร์ uploads/
 */
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, callback) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    callback(isPdf ? null : new Error("Only PDF files are allowed"), isPdf);
  },
});

/**
 * OpenRouter AI Client
 * ใช้งานผ่าน OpenAI Node SDK โดยกำหนด baseURL ไปยัง OpenRouter API
 */
const { getAIConfig, saveAIConfig } = require("../ai-config");
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// ==========================================
// 2. AI MODELS & COMPLETION HELPER
// ==========================================

/**
 * รายชื่อโมเดล AI สำหรับการสลับใช้ (Fallback Strategy)
 * เรียงลำดับจากโมเดลที่มีความฉลาดสูง ไปยังโมเดลฟรีที่ตอบสนองไว
 */
const AI_MODELS = [
  "openai/gpt-5.6-sol-pro",
  "google/gemini-3.8-flash",
  "nvidia/nemotron-3.5-lightning:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
];

/**
 * ฟังก์ชันเรียก AI Completion พร้อมระบบวนลูป Fallback อัตโนมัติ
 * หากโมเดลแรกเกิดปัญหา (Rate Limit, Server Overload) จะสลับไปตัวถัดไปทันที
 *
 * @param {object} request - พารามิเตอร์ส่งให้ client.chat.completions.create
 * @returns {Promise<object>} ผลลัพธ์ Response จาก AI
 */
async function createAICompletion(request) {
  // Load AI engine configuration (cloud or local)
  const { engine, localUrl, localModel } = await getAIConfig();

  // If configured to use a local LLM, bypass the OpenRouter client and call the local endpoint directly
  if (engine === "local") {
    try {
      const cleanUrl = (localUrl || "http://localhost:11434/v1").replace(/\/+$/, "");
      const endpoint = cleanUrl.endsWith("/chat/completions")
        ? cleanUrl
        : cleanUrl.endsWith("/v1")
        ? `${cleanUrl}/chat/completions`
        : `${cleanUrl}/v1/chat/completions`;

      console.log(`[Local AI] Requesting ${endpoint} with model: ${localModel}`);

      const payload = {
        model: localModel || "qwen2.5:7b",
        ...request,
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Local AI request failed with status ${res.status}${errBody ? `: ${errBody}` : ""}`);
      }
      return await res.json();
    } catch (localErr) {
      console.error("[Local AI Error]", localErr);
      throw localErr;
    }
  }

  // Fallback to cloud AI models via OpenRouter with automatic model fallback
  let lastError;

  for (const model of AI_MODELS) {
    try {
      return await client.chat.completions.create({
        ...request,
        model,
      });
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.response?.status;

      // If not a retryable error, rethrow immediately (include 402 for payment/credit exhausted)
      if (![402, 404, 429, 500, 502, 503, 504].includes(status)) {
        throw error;
      }

      console.warn(`[AI Warning] Model ${model} failed with status ${status}; trying next fallback...`);
    }
  }

  throw lastError;
}

// ==========================================
// 3. UTILITY FUNCTIONS
// ==========================================

/**
 * ฟังก์ชันทำความสะอาดข้อความจาก AI ให้เป็น JSON String ที่ถูกต้อง
 * ตัด Markdown backticks, แก้ไข trailing comma, และค้นหาเฉพาะก้อน JSON {}
 *
 * @param {string} text - ข้อความดิบที่ AI ส่งกลับมา
 * @returns {string} JSON String ที่ผ่านการทำความสะอาดแล้ว
 */
function cleanJSON(text) {
  if (typeof text !== "string") {
    throw new Error("AI returned an empty response");
  }

  let cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/gi, "")
    .trim();

  // ค้นหาเฉพาะก้อน Object {} แรกถึงสุดท้าย
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    cleaned = objectMatch[0];
    return cleaned.replace(/,\s*([}\]])/g, "$1").trim();
  }

  // Fallback กรณี AI ไม่ได้ส่ง JSON ก้อนสมบูรณ์ แต่มีระบุคะแนนในข้อความ
  const scoreMatch = cleaned.match(/score\s*[:=]\s*(\d{1,3})/i);
  const statusMatch = cleaned.match(/status\s*[:=]\s*["']?([A-Za-z\s]+)["']?/i);

  if (scoreMatch) {
    const score = Number(scoreMatch[1]) || 0;
    const status = statusMatch ? statusMatch[1].trim() : (score >= 50 ? "Strong Match" : "Weak Match");

    return JSON.stringify({
      score,
      status,
      strengths: ["Candidate profile aligns with the applied position."],
      weaknesses: ["AI could not return a structured JSON response; baseline evaluation applied."],
      suggestions: ["Please review the CV format and re-upload if a more accurate analysis is required."],
    });
  }

  throw new Error("AI did not return a JSON object");
}

/**
 * ฟังก์ชันสกัดข้อความจาก Buffer ไฟล์ PDF
 * รองรับทั้ง pdf-parse ปกติ และ Fallback ไปยัง pdfjs-dist สำหรับไฟล์ PDF พิเศษ
 *
 * @param {Buffer} buffer - ข้อมูลไบนารีของไฟล์ PDF
 * @returns {Promise<string>} ข้อความที่สกัดออกมาได้จากเอกสาร
 */
async function extractPdfText(buffer) {
  try {
    const pdf = await pdfParse(buffer);
    return pdf.text;
  } catch (parseError) {
    console.warn("[PDF Warning] pdf-parse อ่านไฟล์ไม่สำเร็จ กำลังสลับใช้ pdfjs-dist:", parseError.message);

    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const document = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise;

      let text = "";
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str || "").join(" ") + "\n";
      }

      return text;
    } catch (pdfjsError) {
      console.error("[PDF Error] ไม่สามารถอ่านไฟล์ PDF ได้ด้วยทั้งสอง Parser:", pdfjsError);
      throw new Error("ไฟล์ที่เลือกไม่ใช่ PDF ที่ถูกต้องหรือไฟล์อาจเสียหาย กรุณาลองอัปโหลดไฟล์ใหม่อีกครั้ง");
    }
  }
}

// ==========================================
// 4. API ROUTES
// ==========================================

/**
 * --------------------------------------------------------------------------
 * Route: GET /cv/ai-config
 * --------------------------------------------------------------------------
 * ดึงการตั้งค่า AI Engine (Cloud vs Local LLM) ปัจจุบันของเซิร์ฟเวอร์
 */
router.get("/ai-config", (req, res) => {
  return res.json({ success: true, data: getAIConfig() });
});

/**
 * --------------------------------------------------------------------------
 * Route: POST /cv/ai-config
 * --------------------------------------------------------------------------
 * บันทึกการตั้งค่า AI Engine (Cloud vs Local LLM) ไปยังไฟล์เซิร์ฟเวอร์
 */
router.post("/ai-config", (req, res) => {
  try {
    const updated = saveAIConfig(req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * --------------------------------------------------------------------------
 * Route: POST /cv/upload
 * --------------------------------------------------------------------------
 * รับไฟล์ CV (PDF) จากผู้สมัคร -> สกัดข้อความ -> ส่ง AI ประเมินและสร้างคำถาม 5 ข้อในคำขอเดียว
 * -> บันทึกลงฐานข้อมูล Supabase ตาราง cv_history -> ส่งผลลัพธ์กลับไปยังแอป
 *
 * Body Params:
 * - cv (file): ไฟล์ PDF
 * - position (string): ตำแหน่งงานที่ยื่นสมัคร
 * - userId (string): UUID ของผู้สมัครจาก Supabase Auth
 */
router.post("/upload", upload.single("cv"), async (req, res) => {
  console.log(`[POST /cv/upload] ได้รับไฟล์: ${req.file?.originalname}, ตำแหน่ง: ${req.body?.position}, ผู้ใช้: ${req.body?.userId}`);

  try {
    // 1. ตรวจสอบความถูกต้องของข้อมูลที่ส่งมา
    if (!req.file) {
      console.warn("[POST /cv/upload] ไม่พบไฟล์ที่แนบมา");
      return res.status(400).json({
        success: false,
        error: "กรุณาแนบไฟล์ CV (PDF)",
      });
    }

    const position = req.body.position;
    const userId = req.body.userId;

    if (!position) {
      return res.status(400).json({
        success: false,
        error: "ต้องระบุตำแหน่งงาน (Job position)",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "ต้องระบุรหัสผู้ใช้งาน (User ID)",
      });
    }

    // 2. ตรวจสอบว่าเป็นไฟล์ PDF จริง (Magic Number %PDF)
    const buffer = fs.readFileSync(req.file.path);
    if (buffer.subarray(0, 4).toString() !== "%PDF") {
      throw new Error("ไฟล์ที่อัปโหลดไม่ใช่รูปแบบ PDF ที่ถูกต้อง");
    }

    // 3. สกัดข้อความจาก PDF
    let cvText;
    try {
      cvText = await extractPdfText(buffer);
    } catch (pdfError) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: pdfError.message || "ไฟล์ PDF ไม่ถูกต้องหรือเสียหาย",
      });
    }

    // 3.1 อัปโหลดไฟล์ PDF ต้นฉบับขึ้น Supabase Storage (Bucket: cv_files)
    // เพื่อให้ฝ่าย HR สามารถเปิดดูและดาวน์โหลดไฟล์ตัวจริงของผู้สมัครได้ในภายหลัง
    let fileUrl = null;
    try {
      // ทำความสะอาดชื่อไฟล์ ป้องกันอักขระพิเศษ
      const sanitizedName = (req.file.originalname || "cv.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
      // จัดเก็บแยกตามโฟลเดอร์ userId/timestamp-filename.pdf เพื่อไม่ให้ชื่อไฟล์ซ้ำกัน
      const storagePath = `${userId}/${Date.now()}-${sanitizedName}`;

      console.log(`[Supabase Storage] กำลังอัปโหลดไฟล์ไปที่ cv_files/${storagePath}...`);
      const { data: uploadStorageData, error: uploadStorageError } = await supabase.storage
        .from("cv_files")
        .upload(storagePath, buffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadStorageError) {
        console.error("[Supabase Storage Error] ไม่สามารถอัปโหลดไฟล์ไปยัง cv_files:", uploadStorageError.message);
      } else {
        // ดึง Public URL ของไฟล์ที่อัปโหลดสำเร็จ
        const { data: urlData } = supabase.storage
          .from("cv_files")
          .getPublicUrl(storagePath);
        fileUrl = urlData?.publicUrl || null;
        console.log(`[Supabase Storage] อัปโหลดไฟล์ CV สำเร็จ URL: ${fileUrl}`);
      }
    } catch (storageCatchErr) {
      console.error("[Supabase Storage Catch]", storageCatchErr.message);
    }

    // ลบไฟล์ชั่วคราวบนเครื่อง Server หลังสกัดข้อความและอัปโหลดขึ้น Cloud Storage เรียบร้อยแล้ว
    try {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (unlinkErr) {
      console.warn("[Cleanup Notice] ไม่สามารถลบไฟล์ชั่วคราว:", unlinkErr.message);
    }

    // ตรวจสอบว่า PDF มีเนื้อหาข้อความหรือไม่
    if (!cvText.trim()) {
      return res.status(400).json({
        success: false,
        error: "ไม่พบข้อความในไฟล์ PDF (อาจเป็นไฟล์สแกนรูปภาพล้วน)",
      });
    }

    // 4. สร้าง Prompt รวม: วิเคราะห์ CV และสร้างคำถามสัมภาษณ์ 5 ข้อ
const prompt = `
You are an expert HR Recruitment Assistant and technical evaluator for TonYourTires.
Your responsibility is to analyze the candidate's CV and generate 5 customized interview questions specifically tailored to this candidate and the position.

Position:
"${position}"

Candidate CV Content:
"""
${cvText.slice(0, 4000)}
"""

Please analyze the CV based on:
1. Educational background
2. Work experience
3. Technical skills
4. Projects and achievements
5. Relevant experience for the position
6. Candidate strengths
7. Points that need further verification by HR

Critical Instructions:
- Base your evaluation strictly on information present in the CV.
- Do NOT hallucinate or assume skills/experience not mentioned.
- Evaluate work-related qualifications only.
- If information is vague or missing, note it in areas to verify.
- Do NOT make final hiring decisions; this is interview preparation support.
- Output everything in professional ENGLISH language.
- Generate exactly 5 interview questions in ENGLISH.
- Questions must be directly relevant to the CV and the applied role.
- Questions should allow the candidate to demonstrate real practical experience.
- Avoid simple yes/no questions.

Scoring rubric (0-100):
- Education and relevance: 20 pts
- Relevant work experience: 25 pts
- Relevant technical skills: 25 pts
- Projects and achievements: 20 pts
- Overall alignment with role: 10 pts

Return STRICT JSON ONLY (no markdown backticks, no text before or after):
{
  "score": 0,
  "status": "Strong Match",
  "strengths": [
    "Key candidate strengths found in the CV"
  ],
  "weaknesses": [
    "Areas for improvement or gaps identified in the CV"
  ],
  "suggestions": [
    "Actionable recommendations for the candidate"
  ],
  "areas_to_verify": [
    "Specific points or ambiguities HR should clarify during interview"
  ],
  "questions": [
    "Interview question 1",
    "Interview question 2",
    "Interview question 3",
    "Interview question 4",
    "Interview question 5"
  ]
}
`;

    // 5. ส่งคำขอไปยัง AI Engine
    const response = await createAICompletion({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const aiRaw = response.choices[0].message.content;

    // 6. แปลงผลลัพธ์จาก AI
    let parsed;
    try {
      parsed = JSON.parse(cleanJSON(aiRaw));
    } catch (parseError) {
  console.warn(
    "[AI Warning] ผลตอบกลับจาก AI ไม่เป็น JSON ตามโครงสร้าง:",
    parseError.message
  );

  parsed = {
    score: 0,
    candidate_summary: "Unable to complete full CV analysis.",
    education: [],
    work_experience: [],
    technical_skills: [],
    projects_and_achievements: [],
    relevant_experience: [],
    strengths: ["Profile parsed from uploaded document."],
    weaknesses: ["AI response could not be fully structured."],
    suggestions: ["Check CV format and re-upload if necessary."],
    areas_to_verify: [
      "Verify basic qualifications and experience with candidate directly."
    ],
    questions: []
  };
}

    // ชุดคำถามสำรองกรณีฉุกเฉิน
    const fallbackQuestions = [
      `Could you summarize your key experience and technical skills relevant to the ${position || "applied"} role?`,
      "Can you describe a challenging technical problem you solved, your methodology, and the outcome?",
      `If you start in this ${position || "role"} today, what would be your initial priorities in the first 30 days?`,
      "Tell us about a mistake or setback you experienced in a past project and what you learned from it.",
      "Why are you interested in this position, and what are your personal goals for growth here?",
    ];

    let interviewQuestions = Array.isArray(parsed.questions) && parsed.questions.length > 0
      ? parsed.questions.filter((q) => typeof q === "string" && q.trim().length > 0)
      : [];

    if (interviewQuestions.length === 0) {
      interviewQuestions = fallbackQuestions;
    }

    // ============================================================
// ดึงคะแนนจาก AI แบบรองรับหลายรูปแบบ
// ============================================================

const rawScore =
  parsed?.score ??
  parsed?.analysis?.score ??
  parsed?.data?.score ??
  0;

const score = Math.max(
  0,
  Math.min(
    100,
    Number(rawScore) || 0
  )
);

console.log("[CV AI] Raw score:", rawScore);
console.log("[CV AI] Final score:", score);

const isPassed = score >= 50;

    // 7. บันทึกผลลัพธ์ลงตาราง cv_history ใน Supabase พร้อม URL ของไฟล์ CV ใน Storage
    const { data: dbData, error: dbError } = await supabase
      .from("cv_history")
      .insert([
        {
          user_id: userId,
          position,
          score,
          is_passed: isPassed,
          feedback: JSON.stringify(parsed),
          status: "new",
          file_url: fileUrl, // 👈 บันทึก URL ของไฟล์ PDF ที่อัปโหลดขึ้น Supabase Storage
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("[Database Error] บันทึก cv_history ล้มเหลว:", dbError);
    }

    // 8. ส่งผลลัพธ์สมบูรณ์กลับไปยังแอป
   const weaknesses = Array.isArray(parsed.weaknesses)
  ? parsed.weaknesses
  : Array.isArray(parsed.areas_to_verify)
    ? parsed.areas_to_verify
    : [];

const suggestions = Array.isArray(parsed.suggestions)
  ? parsed.suggestions
  : [];

const allowedQuestions = isPassed
  ? interviewQuestions
  : [];

const responsePayload = {
  success: true,

  score,
  is_passed: isPassed,

  cv_id: dbData?.id,
  id: dbData?.id,

  file_url: fileUrl,

  analysis: {
    score,

    status:
      parsed.status ||
      (isPassed ? "Strong Match" : "Weak Match"),

    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths
      : [],

    weaknesses,

    suggestions,
  },

  // คะแนนต่ำกว่า 50 จะไม่ส่งคำถามสัมภาษณ์
  questions: allowedQuestions,

  feedback: {
    ...parsed,
    weaknesses,
    suggestions,
  },

  data: {
    score,
    is_passed: isPassed,

    feedback: {
      ...parsed,
      weaknesses,
      suggestions,
    },

    id: dbData?.id,
    cv_id: dbData?.id,
    file_url: fileUrl,
  },
};

return res.json(responsePayload);
  } catch (error) {
    console.error("[Upload Error] การอัปโหลด CV ล้มเหลว:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      success: false,
      error: error.message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
    });
  }
});

/**
 * --------------------------------------------------------------------------
 * Route: POST /cv/interview/save
 * --------------------------------------------------------------------------
 * บันทึกผลการสัมภาษณ์ AI ลงตาราง interview_history ใน Supabase
 */
router.post("/interview/save", async (req, res) => {
  try {
    const {
      user_id,
      cv_id,
      position,
      score,
      level,
      strengths,
      weaknesses,
      suggestions,
      conversation,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, error: "user_id is required" });
    }

    const { data, error } = await supabase
      .from("interview_history")
      .insert([
        {
          user_id,
          cv_id: cv_id || null,
          position: position || "General Position",
          score: Number(score) || 0,
          level: level || "Junior",
          strengths: Array.isArray(strengths) ? JSON.stringify(strengths) : strengths,
          weaknesses: Array.isArray(weaknesses) ? JSON.stringify(weaknesses) : weaknesses,
          suggestions: Array.isArray(suggestions) ? JSON.stringify(suggestions) : suggestions,
          conversation: typeof conversation === "object" ? JSON.stringify(conversation) : conversation,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[Database Error] บันทึก interview_history ล้มเหลว:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("[Server Error] /cv/interview/save:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * --------------------------------------------------------------------------
 * Route: GET /cv/interviews
 * --------------------------------------------------------------------------
 * ดึงประวัติการสัมภาษณ์ทั้งหมด หรือกรองเฉพาะของ user_id ที่ระบุ
 */
router.get("/interviews", async (req, res) => {
  try {
    const { user_id } = req.query;
    let query = supabase
      .from("interview_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (user_id) {
      query = query.eq("user_id", String(user_id));
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * --------------------------------------------------------------------------
 * Route: GET /cv/users
 * --------------------------------------------------------------------------
 * ดึงรายชื่อผู้สมัครแบบรวมคน (Grouped by user_id) สำหรับแสดงใน HR Dashboard
 * ดึงข้อมูลผู้ใช้จาก cv_history, interview_history, profiles และ auth users
 */
router.get("/users", async (req, res) => {
  try {
    const [cvResult, interviewResult, profileResult] = await Promise.all([
      supabase
        .from("cv_history")
        .select("id, user_id, position, score, status, created_at, file_url")
        .order("created_at", { ascending: false }),
      supabase
        .from("interview_history")
        .select("user_id, cv_id, score, level, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, full_name, role"),
    ]);

    const cvs = cvResult.data || [];
    const interviews = interviewResult.data || [];
    const profiles = profileResult.data || [];

    // ดึง email จาก auth system เพิ่มเติมด้วย Service Role
    let authUsers = [];
    try {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      authUsers = authData?.users || [];
    } catch (e) {
      console.log("[Auth Notice] ไม่สามารถดึง auth users ผ่าน admin api ได้:", e.message);
    }

    // สร้าง Map สำหรับค้นหา email จาก auth users
    const authEmailMap = {};
    for (const au of authUsers) {
      if (au.id && au.email) authEmailMap[au.id] = au.email;
    }

    const userMap = {};

    // รวมกลุ่มข้อมูลจาก CV
    for (const cv of cvs) {
      const uid = cv.user_id;
      if (!userMap[uid]) {
        const prof = profiles.find((p) => p.id === uid) || {};
        userMap[uid] = {
          user_id: uid,
          email: prof.email || authEmailMap[uid] || null,
          full_name: prof.full_name || null,
          cvs: [],
        };
      }
      userMap[uid].cvs.push(cv);
    }

    // รวมกลุ่มข้อมูลผู้สมัครที่มีเฉพาะการสัมภาษณ์
    for (const intv of interviews) {
      const uid = intv.user_id;
      if (uid && !userMap[uid]) {
        const prof = profiles.find((p) => p.id === uid) || {};
        userMap[uid] = {
          user_id: uid,
          email: prof.email || authEmailMap[uid] || null,
          full_name: prof.full_name || null,
          cvs: [],
        };
      }
    }

    // แปลง Map ให้อยู่ในรูป Array สำหรับนำไปแสดงผลในการ์ดผู้สมัคร
    const users = Object.values(userMap).map((u) => {
      const latestCv = u.cvs[0] || null;
      const userInterviews = interviews.filter((i) => i.user_id === u.user_id);
      const latestInterview = userInterviews[0] || null;

      // ชื่อที่ใช้แสดงผล (ลำดับ: Full Name -> Email -> Candidate #ID)
      const fallbackName = u.full_name || u.email || `Candidate #${u.user_id.slice(0, 6)}`;

      return {
        user_id: u.user_id,
        email: u.email,
        full_name: u.full_name,
        display_name: fallbackName,
        cv_count: u.cvs.length,
        interview_count: userInterviews.length,
        latest_status: latestCv ? (latestCv.status || "new") : "new",
        latest_cv_id: latestCv ? latestCv.id : null,
        latest_cv_score: latestCv ? latestCv.score : null,
        latest_interview_score: latestInterview ? latestInterview.score : null,
        latest_position: latestCv ? latestCv.position : (latestInterview ? latestInterview.position : null),
        latest_created_at: latestCv ? latestCv.created_at : (latestInterview ? latestInterview.created_at : null),
        latest_file_url: latestCv ? latestCv.file_url : null,
      };
    });

    return res.json({ success: true, data: users });
  } catch (err) {
    console.error("[Server Error] /cv/users:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * --------------------------------------------------------------------------
 * Route: GET /cv/user/:user_id
 * --------------------------------------------------------------------------
 * ดึงประวัติเชิงลึกทั้งหมดของผู้สมัครรายหนึ่ง (CVs, Interviews, Profile)
 * สำหรับแสดงในหน้า Candidate Profile
 */
router.get("/user/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const [cvResult, interviewResult, profileResult] = await Promise.all([
      supabase
        .from("cv_history")
        .select("id, user_id, position, score, is_passed, status, created_at, feedback, file_url")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("interview_history")
        .select("id, cv_id, user_id, position, score, level, strengths, weaknesses, suggestions, conversation, created_at")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", user_id)
        .maybeSingle(),
    ]);

    const cvs = cvResult.data || [];
    const interviews = interviewResult.data || [];
    const prof = profileResult.data || null;

    // ดึง email จาก auth หากใน profiles ยังไม่มี
    let authEmail = null;
    if (!prof?.email) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
        authEmail = authUser?.user?.email || null;
      } catch (e) {
        console.log("[Auth Notice] ไม่สามารถดึง auth email รายคนได้:", e.message);
      }
    }

    const email = (prof && prof.email) || authEmail || null;
    const displayName = (prof && prof.full_name) || email || (cvs[0]?.position ? `Candidate - ${cvs[0].position}` : `Candidate #${user_id.slice(0, 6)}`);

    return res.json({
      success: true,
      cvs,
      interviews,
      profile: {
        id: user_id,
        email: email,
        full_name: prof ? prof.full_name : null,
        display_name: displayName,
      },
    });
  } catch (err) {
    console.error("[Server Error] /cv/user/:user_id:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * --------------------------------------------------------------------------
 * Route: PATCH /cv/status
 * --------------------------------------------------------------------------
 * อัปเดตสถานะการคัดเลือกของผู้สมัคร (เช่น 'new', 'reviewing', 'interview', 'passed', 'rejected')
 * บันทึกลงตาราง cv_history โดยใช้ Service Key เพื่อหลีกเลี่ยงข้อจำกัด RLS
 */
router.patch("/status", async (req, res) => {
  try {
    const { cv_id, status } = req.body;
    if (!cv_id || !status) {
      return res.status(400).json({ success: false, error: "cv_id และ status ต้องระบุทั้งคู่" });
    }

    const { data, error } = await supabase
      .from("cv_history")
      .update({ status })
      .eq("id", cv_id)
      .select()
      .single();

    if (error) {
      console.error("[Database Error] อัปเดต cv status ล้มเหลว:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // ------------------------------------------------------------------------
    // สร้างการแจ้งเตือนอัตโนมัติไปยังผู้สมัคร เมื่อ Admin / HR เปลี่ยนสถานะ
    // ------------------------------------------------------------------------
    if (data && data.user_id) {
      try {
        const positionName = data.position || "ตำแหน่งที่สมัคร";

        // Notification titles in English by status
        const statusTitles = {
          new: "📄 Application Received",
          reviewing: "🔍 Under Review",
          interview: "🎉 Shortlisted for Interview",
          passed: "🏆 Congratulations! Selected",
          rejected: "📢 Application Update",
        };

        // Notification message details in English
        const statusMessages = {
          new: `Your application for "${positionName}" has been successfully received.`,
          reviewing: `Our HR team is currently reviewing your application for "${positionName}".`,
          interview: `Congratulations! You have been shortlisted for an interview for "${positionName}".`,
          passed: `Congratulations! You have been selected for the "${positionName}" role. HR will contact you regarding next steps.`,
          rejected: `Thank you for your interest in the "${positionName}" position. We have decided to move forward with other candidates at this time.`,
        };

        const title = statusTitles[status] || "📢 Application Status Update";
        const message = statusMessages[status] || `Your application status for "${positionName}" has been updated to "${status}".`;

        const notifPayload = {
          user_id: data.user_id,
          title,
          message,
          type: "status_update",
          related_cv_id: data.id ? String(data.id) : null,
          is_read: false,
        };

        const { error: notifError } = await supabase.from("notifications").insert([notifPayload]);

        if (notifError) {
          console.warn("[Notification Warning] Insert ติดปัญหา:", notifError.message, "- กำลังลอง fallback...");
          // Fallback: หาก column related_cv_id ใน Supabase ยังเป็นประเภท bigint ให้ insert โดยเว้น null ไว้
          const retry = await supabase.from("notifications").insert([
            {
              ...notifPayload,
              related_cv_id: null,
            },
          ]);

          if (retry.error) {
            console.error("[Notification Error] ไม่สามารถสร้างการแจ้งเตือนได้:", retry.error.message);
          } else {
            console.log(`[Notification Success (Fallback)] สร้างการแจ้งเตือนสำเร็จสำหรับผู้ใช้: ${data.user_id}`);
          }
        } else {
          console.log(`[Notification Success] สร้างการแจ้งเตือนสถานะ "${status}" ให้ผู้ใช้ ${data.user_id} เรียบร้อยแล้ว`);
        }
      } catch (notifErr) {
        console.warn("[Notification Catch Error]:", notifErr.message);
      }
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("[Server Error] /cv/status:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * --------------------------------------------------------------------------
 * Route: GET /cv/notifications/:user_id
 * --------------------------------------------------------------------------
 * ดึงรายการแจ้งเตือนทั้งหมดของผู้สมัครรายนั้นๆ
 */
router.get("/notifications/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[Server Error] /cv/notifications/:user_id:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * --------------------------------------------------------------------------
 * Route: PATCH /cv/notifications/read
 * --------------------------------------------------------------------------
 * อัปเดตสถานะการแจ้งเตือนเป็น "อ่านแล้ว" (is_read = true)
 * สามารถส่ง id (แจ้งเตือนรายการเดียว) หรือ user_id (ทำเครื่องหมายอ่านแล้วทั้งหมด)
 */
router.patch("/notifications/read", async (req, res) => {
  try {
    const { id, user_id } = req.body;
    let query = supabase.from("notifications").update({ is_read: true });

    if (id) {
      query = query.eq("id", id);
    } else if (user_id) {
      query = query.eq("user_id", user_id).eq("is_read", false);
    } else {
      return res.status(400).json({ success: false, error: "ต้องระบุ id หรือ user_id" });
    }

    const { data, error } = await query.select();
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error("[Server Error] /cv/notifications/read:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;