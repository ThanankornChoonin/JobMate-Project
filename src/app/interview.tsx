/**
 * ============================================================================
 * หน้าจอ: จำลองการสัมภาษณ์งาน (AI Mock Interview Screen)
 * ============================================================================
 * ไฟล์: src/app/interview.tsx
 *
 * รายละเอียด:
 * - ดำเนินการสัมภาษณ์งานจำลองแบบ Chat Interactive ระหว่างผู้สมัครกับ AI Interviewer
 * - แสดงคำถามตามลำดับทีละข้อจากชุดคำถามที่ได้รับจากหน้าวิเคราะห์เรซูเม่ (หรือ Default questions หากไม่มี)
 * - ผู้สมัครพิมพ์ตอบคำถาม และระบบจะนำคำถามถัดไปมาแสดง
 * - เมื่อตอบครบทุกคำถาม ระบบจะรวบรวมคำตอบทั้งหมด ส่งไปยังโมเดล AI (ผ่าน OpenRouter)
 *   เพื่อให้ AI ประเมินผลอย่างละเอียด:
 *     - คะแนน (0 - 100)
 *     - สถานะผ่าน/ไม่ผ่าน (Passed / Failed)
 *     - จุดแข็ง (Strengths) ในคำตอบ
 *     - จุดที่ควรปรับปรุง (Weaknesses)
 *     - คำแนะนำเชิงพัฒนา (Suggestions)
 * - บันทึกผลการสัมภาษณ์ลงฐานข้อมูล Supabase (ตาราง interview_history)
 * - นำทางผู้ใช้ไปยังหน้ารายงานผลการสัมภาษณ์ (/result)
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useLanguage } from "../context/language-context";
import { model } from "../lib/openrouter";
import { supabase } from "../lib/supabase";

/**
 * ฟังก์ชันแยกวิเคราะห์และทำความสะอาดผลลัพธ์การประเมินจาก AI
 * แปลงข้อความที่ได้รับจาก AI ให้เป็นโครงสร้างข้อมูล JSON ที่ถูกต้อง
 * หากมีข้อผิดพลาด จะพยายามใช้ Regular Expression สกัดข้อมูลแบบ Fallback
 *
 * @param rawText ข้อความผลการประเมินดิบที่ได้รับจาก AI
 * @returns Object ผลการประเมิน { score, level, strengths, weaknesses, suggestions }
 */
function parseAIInterviewResult(rawText: string) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("AI returned an empty response");
  }

  // 1. ตัด thinking process ทิ้ง หากโมเดลพ่น thinking ออกมา
  let text = rawText;
  const thinkingMarkers = ["```json", "output:", "evaluation:", "result:"];
  for (const marker of thinkingMarkers) {
    const idx = text.toLowerCase().lastIndexOf(marker);
    if (idx !== -1 && idx > 40) {
      const candidate = text.slice(idx + marker.length);
      if (candidate.includes("{") && candidate.includes("}")) {
        text = candidate;
        break;
      }
    }
  }

  // 2. กำจัด markdown code block tags
  let cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/gi, "")
    .trim();

  // 3. ค้นหาจุดเริ่มต้น { และจุดสิ้นสุด } ของ JSON
  const firstBrace = cleaned.indexOf("{");
  if (firstBrace === -1) {
    throw new Error("No JSON structure found in AI response");
  }

  let lastBrace = cleaned.lastIndexOf("}");
  if (lastBrace === -1 || lastBrace < firstBrace) {
    cleaned = cleaned.slice(firstBrace) + '\n  "suggestions": []\n}';
  } else {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  // 4. ทำความสะอาด placeholders และ trailing commas
  cleaned = cleaned
    .replace(/:\s*\[\s*\.\.\.\s*\]/g, ": []")
    .replace(/,\s*([}\]])/g, "$1");

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseError) {
    // 5. Fallback ใช้ Regex สกัดข้อมูลทีละฟิลด์เมื่อ JSON.parse ล้มเหลว
    console.warn("JSON.parse failed, attempting regex field extraction:", parseError);

    const scoreMatch = rawText.match(/["']?score["']?\s*:\s*(\d+)/i);
    const parsedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

    const levelMatch = rawText.match(/["']?level["']?\s*:\s*["']([^"']+)["']/i);
    const parsedLevel = levelMatch ? levelMatch[1] : null;

    if (parsedScore !== null) {
      const extractArray = (field: string): string[] => {
        const regex = new RegExp(`["']?${field}["']?\\s*:\\s*\\[([\\s\\S]*?)\\]`, "i");
        const match = rawText.match(regex);
        if (match && match[1]) {
          return match[1]
            .split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map((item) => item.replace(/["'\[\]\n\r]/g, "").trim())
            .filter(Boolean);
        }
        return [];
      };

      parsed = {
        score: parsedScore,
        level: parsedLevel || (parsedScore >= 50 ? "Passed" : "Failed"),
        strengths: extractArray("strengths"),
        weaknesses: extractArray("weaknesses"),
        suggestions: extractArray("suggestions"),
      };
    } else {
      throw new Error("Could not parse AI response into structured data");
    }
  }

  // ปรับสเกลคะแนน: หากโมเดลให้คะแนนเต็ม 10 ให้คูณ 10 ให้เป็นสเกล 100
  if (typeof parsed.score === "number" && parsed.score > 0 && parsed.score <= 10) {
    parsed.score = Math.round(parsed.score * 10);
  }

  return parsed;
}

/**
 * คอมโพเนนต์หลักของหน้าจอสัมภาษณ์งาน
 */
export default function Interview() {
  const router = useRouter();
  const { t } = useLanguage();
  const { cv_id, position, questions } = useLocalSearchParams();

  // ชุดคำถามสำรอง (Default) กรณีที่ไม่มีคำถามส่งมาจากหน้าก่อนหน้า
  const defaultQuestions = [
    `Please introduce yourself and summarize your key skills and experience relevant to the position of ${position || "this role"}.`,
    "What has been the most challenging technical problem or project you have worked on, and how did you solve it?",
    `If you are selected for this ${position || "role"}, what would you focus on in your first 30 days?`,
  ];

  // พยายามแปลง parameter questions ที่ส่งเข้ามา
  let rawParsedQuestions: string[] = [];
  try {
    if (questions) {
      const p = typeof questions === "string" ? JSON.parse(questions) : questions;
      if (Array.isArray(p) && p.length > 0) {
        rawParsedQuestions = p;
      }
    }
  } catch (e) {
    console.warn("Could not parse questions param:", e);
  }

  // คำถามที่จะใช้จริงในการสัมภาษณ์
  const aiQuestions: string[] =
    rawParsedQuestions.length > 0 ? rawParsedQuestions : defaultQuestions;

  // State สำหรับจัดการแชตและคำตอบ
  const [messages, setMessages] = useState<any[]>([]);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // เริ่มต้น Chat Session ของ OpenRouter
  const chat = useRef(
    model.startChat({
      history: [],
    })
  );

  // ส่งคำถามข้อแรกลงในกล่องข้อความเมื่อเปิดหน้าจอ
  useEffect(() => {
    if (aiQuestions.length > 0) {
      setMessages([
        {
          sender: "ai",
          text: aiQuestions[0],
        },
      ]);
    }
  }, []);

  /**
   * ส่งคำตอบของผู้สมัคร
   * 1. ตรวจสอบและเพิ่มคำตอบลงในรายการแชต
   * 2. หากยังไม่ครบทุกข้อ: ส่งคำถามถัดไป
   * 3. หากครบทุกข้อ: รวบรวมบทสนทนาทั้งหมด แล้วสั่งให้ AI วิเคราะห์ประเมินผล
   * 4. บันทึกประวัติการสัมภาษณ์ลง Supabase
   * 5. นำทางไปยังหน้าผลลัพธ์ (/result)
   */
  const sendAnswer = async () => {
    if (!answer.trim() || loading) return;

    const currentAnswer = answer.trim();
    setAnswer("");

    const updatedAnswers = [...answers, currentAnswer];
    setAnswers(updatedAnswers);

    const updatedMessages = [
      ...messages,
      {
        sender: "user",
        text: currentAnswer,
      },
    ];

    setMessages(updatedMessages);
    setLoading(true);

    // ยังไม่ครบทุกข้อ -> แสดงคำถามถัดไป
    if (questionNumber < aiQuestions.length) {
      const nextQuestion = aiQuestions[questionNumber];

      setTimeout(() => {
        setMessages([
          ...updatedMessages,
          {
            sender: "ai",
            text: nextQuestion,
          },
        ]);
        setQuestionNumber((prev) => prev + 1);
        setLoading(false);
      }, 400);
      return;
    }

    // ครบแล้ว ประเมินผล
    try {
      const prompt = `
You are a STRICT professional HR interviewer evaluating a candidate for the position:
"${position || "General Position"}"

Evaluate ONLY the candidate's actual answers below.

DO NOT assume knowledge, skills, experience, or abilities that the candidate did not explicitly demonstrate.

INTERVIEW QUESTIONS AND CANDIDATE ANSWERS:

${updatedAnswers
  .map(
    (a, i) =>
      `Question ${i + 1}: ${aiQuestions[i] || ""}
Candidate's Real Answer ${i + 1}: ${a}`
  )
  .join("\n\n")}

==================================================
STRICT EVALUATION RULES
==================================================

1. Evaluate every answer based ONLY on what the candidate actually wrote.

2. Check every answer for:

- Relevance: Does the answer actually answer the question?
- Specificity: Does it contain concrete details or examples?
- Knowledge: Does it demonstrate actual understanding?
- Practical ability: Does it explain what the candidate actually did?
- Problem solving: Does it explain a logical approach?
- Communication: Is the answer understandable and coherent?
- Evidence: Does the candidate provide real examples, projects, technologies, actions, or results?

3. DO NOT reward generic statements.

Examples of WEAK answers:

"I am hardworking."
"I am a fast learner."
"I can solve problems."
"I am good at teamwork."
"I know React."
"I know Python."

These statements provide very little evidence unless the candidate explains
a specific example, process, project, implementation, or result.

4. DO NOT give technical points simply because the candidate mentions a technology.

For example:

"I know React and Node.js."

This does NOT demonstrate technical expertise.

The candidate must explain how they used the technology or demonstrate
understanding through a relevant example.

5. DO NOT infer missing information.

If the candidate does not explain something, assume it was NOT demonstrated.

6. If an answer is gibberish, nonsense, random words, unrelated to the question,
or has no meaningful content:

That answer receives 0 points.

7. If MOST answers are gibberish, irrelevant, extremely short, or meaningless:

The FINAL SCORE MUST be between 0 and 20.

8. If ALL answers are meaningless, gibberish, empty, or unrelated:

FINAL SCORE MUST be 0.

9. If answers are short but still meaningful:

Do NOT automatically give 0.

Instead, give a low score because there is insufficient evidence.

10. Do not reward confidence, positive wording, or claims without evidence.

==================================================
SCORING
==================================================

Score from 0 to 100.

Evaluate these five categories:

1. Relevance to the questions: 20 points
2. Technical / professional knowledge: 25 points
3. Practical problem solving: 20 points
4. Specificity and evidence: 20 points
5. Communication and clarity: 15 points

TOTAL: 100 points.

==================================================
SCORE GUIDELINES
==================================================

0-19:
Almost no meaningful evidence.
Mostly nonsense, irrelevant, empty, or invalid answers.

20-39:
Very weak answers.
Limited relevance and almost no demonstrated knowledge.

40-49:
Weak response.
Some relevant information exists, but major gaps remain.

50-59:
Basic acceptable response.
Shows some understanding but lacks depth and evidence.

60-69:
Moderate response.
Generally relevant with reasonable understanding.

70-79:
Good response.
Consistently relevant, specific, and demonstrates practical understanding.

80-89:
Very strong response.
Detailed, technically sound, practical, and supported by concrete examples.

90-100:
Exceptional response.
Highly specific, technically deep, logically structured, and consistently demonstrates strong expertise.

IMPORTANT:

Do NOT give a score above 70 unless the candidate provides clear evidence
of relevant knowledge or practical ability.

Do NOT give a score above 80 unless the candidate demonstrates strong depth,
specificity, and practical reasoning across multiple answers.

A candidate must EARN the score through evidence.

==================================================
POSITION-SPECIFIC EVALUATION
==================================================

Evaluate the candidate according to the position:

"${position || "General Position"}"

For technical positions:

- Technical understanding is important.
- Practical implementation is important.
- Problem solving is important.
- Mentioning programming languages or frameworks alone is NOT enough.

For non-technical positions:

- Evaluate role-related knowledge.
- Evaluate decision making.
- Evaluate communication.
- Evaluate problem solving.
- Evaluate concrete examples.

==================================================
FINAL CONSISTENCY CHECK
==================================================

Before producing the final score, verify:

1. Did the candidate actually answer the questions?
2. Are the answers relevant?
3. Did the candidate provide specific evidence?
4. Did the candidate demonstrate actual knowledge?
5. Did the candidate demonstrate practical problem solving?
6. Are the answers coherent?
7. Are any answers gibberish or meaningless?
8. Am I giving points for something the candidate never demonstrated?

If the answers are vague or generic, KEEP THE SCORE LOW.

If the candidate provides no meaningful evidence of competence,
DO NOT give a high score.

==================================================
FEEDBACK
==================================================

STRENGTHS:

Only mention strengths that are clearly demonstrated in the actual answers.

Do NOT write generic strengths.

WEAKNESSES:

Identify specific missing knowledge, weak reasoning, lack of evidence,
irrelevant answers, or unclear explanations.

SUGGESTIONS:

Give specific and actionable recommendations based directly on the weaknesses.

==================================================
LEVEL
==================================================

The level MUST match the score:

0-49 = "Failed"
50-69 = "Passed"
70-84 = "Strong"
85-100 = "Excellent"

==================================================
OUTPUT
==================================================

RETURN ONLY VALID JSON.

No markdown.
No explanation outside JSON.
No text before or after JSON.

Use exactly this structure:

{
  "score": 0,
  "level": "Failed",
  "strengths": [
    "Specific strength demonstrated by the candidate"
  ],
  "weaknesses": [
    "Specific weakness demonstrated by the candidate"
  ],
  "suggestions": [
    "Specific actionable recommendation"
  ]
}
`;

      const result = await chat.current.sendMessage(prompt);
      const rawText = result.response.text();
      console.log("Raw AI response:\n", rawText);

      let interviewResult: any;
      try {
        interviewResult = parseAIInterviewResult(rawText);
      } catch (parseErr) {
        console.warn("AI response parsing failed, calculating dynamic fallback result:", parseErr);

        // Fallback อัจฉริยะ: คำนวณจากคำตอบจริงของผู้สมัคร
        const totalChars = updatedAnswers.reduce((sum, a) => sum + a.trim().length, 0);
        const hasSubstantialAnswers = totalChars >= 50 && updatedAnswers.every((a) => a.trim().length >= 3);
        const fallbackScore = 0;

        interviewResult = {
          score: fallbackScore,
          level: "Failed",
          strengths: hasSubstantialAnswers
            ? [`Candidate answered all ${aiQuestions.length} interview questions.`, "Demonstrated baseline communication and shared relevant background."]
            : ["Completed the interview steps."],
          weaknesses: hasSubstantialAnswers
            ? ["Could provide deeper technical explanations and practical examples."]
            : ["Answers were too brief. Provide more specific experience and project context."],
          suggestions: [
            "Review core technical concepts and industry practices relevant to this role.",
            "Practice structured answering methods like the STAR framework (Situation, Task, Action, Result).",
          ],
        };
      }

      // ตรวจสอบความถูกต้องของคะแนน (Safety Fallback Check)
      let parsedScore = Number(interviewResult.score);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        parsedScore = 0;
      }

      // ป้องกัน AI Hallucination ให้คะแนน 100 ทั้งที่ผลประเมินคือ Failed หรือไม่ตอบ
      const hasNoAnswerFeedback = Array.isArray(interviewResult.weaknesses) && interviewResult.weaknesses.some((w: string) =>
        typeof w === "string" && (
          w.toLowerCase().includes("no answer") ||
          w.toLowerCase().includes("lack of knowledge") ||
          w.toLowerCase().includes("gibberish") ||
          w.toLowerCase().includes("irrelevant") ||
          w.toLowerCase().includes("did not provide") ||
          w.toLowerCase().includes("too short")
        )
      );

      if (hasNoAnswerFeedback && parsedScore > 50) {
        parsedScore = 0;
        interviewResult.level = "Failed";
      }

      interviewResult.score = parsedScore;
      interviewResult.level = parsedScore >= 50 ? (interviewResult.level || "Passed") : "Failed";
      interviewResult.strengths = Array.isArray(interviewResult.strengths) ? interviewResult.strengths : [];
      interviewResult.weaknesses = Array.isArray(interviewResult.weaknesses) ? interviewResult.weaknesses : [];
      interviewResult.suggestions = Array.isArray(interviewResult.suggestions) ? interviewResult.suggestions : [];

      // บันทึกลง Supabase (เรียกผ่าน Backend API เพื่อไม่ให้ติดปัญหา RLS)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        try {
          const savePayload = {
            user_id: user.id,
            cv_id: cv_id ? String(cv_id) : null,
            position: position || "General Position",
            score: interviewResult.score,
            level: interviewResult.level,
            strengths: interviewResult.strengths,
            weaknesses: interviewResult.weaknesses,
            suggestions: interviewResult.suggestions,
            conversation: updatedMessages,
          };

          const saveRes = await fetch("http://localhost:3000/cv/interview/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(savePayload),
          });

          if (!saveRes.ok) {
            // สำรองหาก backend ไม่ตอบสนอง: ลองยิง Supabase client โดยตรง
            console.warn("Backend /interview/save failed, attempting direct Supabase insert...");
            await supabase.from("interview_history").insert({
              user_id: user.id,
              cv_id: cv_id ? String(cv_id) : null,
              position: position || "General Position",
              score: interviewResult.score,
              level: interviewResult.level,
              strengths: JSON.stringify(interviewResult.strengths),
              weaknesses: JSON.stringify(interviewResult.weaknesses),
              suggestions: JSON.stringify(interviewResult.suggestions),
              conversation: JSON.stringify(updatedMessages),
            });
          }
        } catch (saveErr) {
          console.error("Error saving interview:", saveErr);
          // Fallback direct insert
          try {
            await supabase.from("interview_history").insert({
              user_id: user.id,
              cv_id: cv_id ? String(cv_id) : null,
              position: position || "General Position",
              score: interviewResult.score,
              level: interviewResult.level,
              strengths: JSON.stringify(interviewResult.strengths),
              weaknesses: JSON.stringify(interviewResult.weaknesses),
              suggestions: JSON.stringify(interviewResult.suggestions),
              conversation: JSON.stringify(updatedMessages),
            });
          } catch (directErr) {
            console.error("Direct insert also failed:", directErr);
          }
        }
      }

      router.push({
        pathname: "/result",
        params: {
          result: JSON.stringify(interviewResult),
          position,
        },
      });
    } catch (err: any) {
      console.error("Evaluation Error:", err);
      Alert.alert(
        t.interview.evaluating || "Evaluation Error",
        err?.message || "An unexpected error occurred during interview evaluation."
      );
    } finally {
      setLoading(false);
    }
  };

  const totalQuestions = aiQuestions.length || 5;
  const progressPercent = Math.min((questionNumber / totalQuestions) * 100, 100);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.topBarTitleContainer}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {position || t.interview.title}
            </Text>
            <Text style={styles.topBarSubText}>
              {t.interview.question} {questionNumber} {t.interview.of} {totalQuestions}
            </Text>
          </View>
          <View style={styles.interviewerAvatar}>
            <MaterialCommunityIcons name="robot" size={20} color="#2563EB" />
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* Chat Area */}
        <View style={styles.chatArea}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.map((msg, index) => {
              const isUser = msg.sender === "user";
              return (
                <View
                  key={index}
                  style={[
                    styles.messageRow,
                    { justifyContent: isUser ? "flex-end" : "flex-start" },
                  ]}
                >
                  {!isUser && (
                    <View style={styles.aiAvatarSmall}>
                      <MaterialCommunityIcons
                        name="account-tie"
                        size={18}
                        color="#2563EB"
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.aiBubble,
                    ]}
                  >
                    {!isUser && (
                      <Text style={styles.aiSenderLabel}>{t.interview.interviewer}</Text>
                    )}
                    <Text
                      style={isUser ? styles.userMessageText : styles.aiMessageText}
                    >
                      {msg.text}
                    </Text>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.messageRow, { justifyContent: "flex-start" }]}>
                <View style={styles.aiAvatarSmall}>
                  <MaterialCommunityIcons
                    name="account-tie"
                    size={18}
                    color="#2563EB"
                  />
                </View>
                <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingText}>
                    {questionNumber >= totalQuestions
                      ? t.interview.evaluating
                      : t.interview.thinking}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Bottom Input Controls */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={t.interview.placeholder}
            placeholderTextColor="#94A3B8"
            multiline
            value={answer}
            onChangeText={setAnswer}
            style={styles.textInput}
            editable={!loading}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!answer.trim() || loading) && styles.sendButtonDisabled,
            ]}
            disabled={!answer.trim() || loading}
            onPress={sendAnswer}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitleContainer: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 12,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  topBarSubText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  interviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "#E2E8F0",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2563EB",
  },
  chatArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  aiAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
    elevation: 2,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  aiSenderLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 4,
  },
  userMessageText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },
  aiMessageText: {
    color: "#0F172A",
    fontSize: 15,
    lineHeight: 22,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: "#0F172A",
    maxHeight: 120,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#94A3B8",
    elevation: 0,
    shadowOpacity: 0,
  },
});