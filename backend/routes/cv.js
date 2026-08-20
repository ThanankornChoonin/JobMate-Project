const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const router = express.Router();

// ตั้งค่า Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    callback(isPdf ? null : new Error("Only PDF files are allowed"), isPdf);
  },
});

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// ฟังก์ชันทำความสะอาด JSON จาก AI
function cleanJSON(text) {
  if (typeof text !== "string") {
    throw new Error("AI returned an empty response");
  }

  let cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  // Keep only the JSON object if the model adds a sentence before or after it.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("AI did not return a JSON object");
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  // Remove trailing commas before closing objects or arrays.
  return cleaned.replace(/,\s*([}\]])/g, "$1").trim();
}

async function extractPdfText(buffer) {
  try {
    const pdf = await pdfParse(buffer);
    return pdf.text;
  } catch (parseError) {
    console.warn("pdf-parse could not read the PDF; trying pdfjs-dist:", parseError.message);

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
  }
}

router.post("/upload", upload.single("cv"), async (req, res) => {
  try {
    // ตรวจว่ามีไฟล์ CV
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "CV file is required",
      });
    }

    // รับตำแหน่งงานและ userId จาก Request Body
    const position = req.body.position;
    const userId = req.body.userId;

    if (!position) {
      return res.status(400).json({
        success: false,
        error: "Job position is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    console.log("POSITION =", position);
    console.log("USER ID =", userId);

    // อ่าน PDF
    const buffer = fs.readFileSync(req.file.path);

    // Verify the actual file header before passing it to pdf-parse.
    if (buffer.subarray(0, 4).toString() !== "%PDF") {
      throw new Error("Uploaded file is not a valid PDF");
    }

    const cvText = await extractPdfText(buffer);

    console.log("CV TEXT LENGTH =", cvText.length);

    // =====================================================
    // 1. วิเคราะห์ CV ตามตำแหน่งงาน
    // =====================================================

    const completion = await client.chat.completions.create({
      model: "google/gemini-2.5-flash-lite",

      messages: [
        {
          role: "system",
          content: `
You are a professional HR recruiter for TonYourTires.

Your task is to evaluate a candidate's CV for a SPECIFIC JOB POSITION.

You MUST evaluate the CV based on the selected job position.

Use the following scoring rules:

90-100 = Excellent match
75-89 = Strong match
60-74 = Moderate match
50-59 = Minimum acceptable match
0-49 = Not qualified

Return ONLY valid JSON.
Do not use markdown.
Do not include explanations outside JSON.

Required JSON format:

{
  "score": 0,
  "status": "",
  "strengths": [],
  "weaknesses": [],
  "suggestions": []
}
`,
        },
        {
          role: "user",
          content: `
Selected Job Position:
${position}

Candidate CV:
${cvText}

Evaluate this candidate specifically for the selected position.

Return ONLY JSON.
`,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const aiText = completion.choices[0].message.content;
    const cleanedAnalysis = cleanJSON(aiText);
    const analysis = JSON.parse(cleanedAnalysis);

    if (
      typeof analysis.score !== "number" ||
      analysis.score < 0 ||
      analysis.score > 100
    ) {
      throw new Error("Invalid AI score");
    }

    analysis.strengths = Array.isArray(analysis.strengths)
      ? analysis.strengths
      : [];
    analysis.weaknesses = Array.isArray(analysis.weaknesses)
      ? analysis.weaknesses
      : [];
    analysis.suggestions = Array.isArray(analysis.suggestions)
      ? analysis.suggestions
      : [];

    // กำหนดสถานะจากคะแนน
    if (analysis.score >= 90) {
      analysis.status = "Excellent Match";
    } else if (analysis.score >= 75) {
      analysis.status = "Strong Match";
    } else if (analysis.score >= 60) {
      analysis.status = "Moderate Match";
    } else if (analysis.score >= 50) {
      analysis.status = "Qualified";
    } else {
      analysis.status = "Rejected";
    }

    // กำหนดว่าผ่านหรือไม่ผ่าน (คะแนน >= 50 ถือว่าผ่าน)
    const isPassed = analysis.score >= 50;

    // =====================================================
    // 2. บันทึกผล CV ลง Supabase ตาราง cv_history
    // =====================================================

    const { data: cvData, error: dbError } = await supabase
      .from("cv_history")
      .insert([
        {
          user_id: userId,
          position: position,
          score: analysis.score,
          is_passed: isPassed,
          feedback: JSON.stringify(analysis),
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("SUPABASE ERROR =", dbError);
      throw new Error("Failed to save CV history to database");
    }

    // =====================================================
    // 3. สร้างคำถามสัมภาษณ์
    // =====================================================

    const interview = await client.chat.completions.create({
      model: "google/gemini-2.5-flash-lite",

      messages: [
        {
          role: "system",
          content: `
You are a professional HR interviewer for TonYourTires.

Create exactly 5 interview questions for the candidate based on position and CV.

Return ONLY valid JSON.
Do not use markdown.

Required format:
{
  "questions": [
    "...",
    "...",
    "...",
    "...",
    "..."
  ]
}
`,
        },
        {
          role: "user",
          content: `
Selected Job Position:
${position}

Candidate CV:
${cvText}

Create exactly 5 interview questions.
`,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const interviewText = interview.choices[0].message.content;
    const cleanedQuestions = cleanJSON(interviewText);
    const questions = JSON.parse(cleanedQuestions);

    if (
      !questions.questions ||
      !Array.isArray(questions.questions) ||
      questions.questions.length !== 5
    ) {
      throw new Error("AI did not return exactly 5 questions");
    }

    // ลบไฟล์ PDF หลังประมวลผลเสร็จ
    fs.unlink(req.file.path, (err) => {
      if (err) console.log("Could not delete uploaded file:", err.message);
    });

    // =====================================================
    // 4. ส่งผลกลับไปยังแอป
    // =====================================================

    res.json({
      success: true,
      cv_id: cvData.id, // ส่ง ID จากตาราง cv_history กลับไป
      is_passed: cvData.is_passed, // ส่งสถานะผ่าน/ไม่ผ่าน
      position,
      analysis,
      questions,
    });
  } catch (err) {
    console.log("UPLOAD ERROR =", err);

    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;