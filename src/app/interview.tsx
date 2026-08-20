import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { model } from "../lib/openrouter";
import { supabase } from "../lib/supabase";

export default function Interview() {
  const router = useRouter();
  const { cv_id, position, questions } = useLocalSearchParams();

  const aiQuestions: string[] = questions
    ? JSON.parse(questions as string)
    : [];

  const [messages, setMessages] = useState<any[]>([]);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const chat = useRef(
    model.startChat({
      history: [],
    })
  );

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

    // ยังไม่ครบทุกข้อ -> ส่งคำถามถัดไป
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
You are a strict professional HR interviewer evaluating a candidate for the position: "${position || "General Position"}".

Analyze the candidate's responses carefully:
${updatedAnswers.map((a, i) => `Question ${i + 1}: ${aiQuestions[i] || ""}\nAnswer ${i + 1}: ${a}`).join("\n\n")}

STRICT SCORING RULES:
1. If answers are gibberish, irrelevant, empty, off-topic, or "no answers provided":
   - "score": MUST BE 0.
   - "level": "Failed".
   - DO NOT return 100 under any circumstances if answers are missing or invalid.
2. Evaluate technical knowledge, clarity, and relevance strictly based on the questions.
3. Scoring scale:
   - 85-100 = Excellent answer
   - 70-84 = Good / Passed
   - 50-69 = Moderate
   - 0-49 = Failed / Irrelevant / Poor answer

Return ONLY a raw JSON object without markdown formatting:
{
  "score": 0,
  "level": "Failed",
  "strengths": ["List strengths if any"],
  "weaknesses": ["List weaknesses or reasons for failure"],
  "suggestions": ["List actionable suggestions"]
}
`;

      const result = await chat.current.sendMessage(prompt);
      const rawText = result.response.text();

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid response format from AI");
      }

      const interviewResult = JSON.parse(jsonMatch[0]);

      // Safety Fallback Check
      let parsedScore = Number(interviewResult.score);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        parsedScore = 0;
      }

      // ป้องกัน AI Hallucination ให้คะแนน 100 ทั้งที่ผลประเมินคือ Failed หรือไม่ตอบ
      const hasNoAnswerFeedback = interviewResult.weaknesses?.some((w: string) =>
        w.toLowerCase().includes("no answer") || w.toLowerCase().includes("lack of knowledge")
      );

      if (hasNoAnswerFeedback && parsedScore > 50) {
        parsedScore = 0;
        interviewResult.level = "Failed";
      }

      interviewResult.score = parsedScore;
      interviewResult.level = parsedScore >= 50 ? (interviewResult.level || "Passed") : "Failed";

      // บันทึกลง Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error: insertError } = await supabase.from("interview_history").insert({
          user_id: user.id,
          cv_id: cv_id ? String(cv_id) : null, // แปลง cv_id เป็น String/UUID ให้ตรงกับตาราง Supabase
          position: position || "General Position",
          score: interviewResult.score,
          level: interviewResult.level,
          strengths: JSON.stringify(interviewResult.strengths || []),
          weaknesses: JSON.stringify(interviewResult.weaknesses || []),
          suggestions: JSON.stringify(interviewResult.suggestions || []),
          conversation: JSON.stringify(updatedMessages),
        });

        if (insertError) {
          console.error("Supabase Insert Error:", insertError);
        }
      }

      router.push({
        pathname: "/result",
        params: {
          result: JSON.stringify(interviewResult),
          position,
        },
      });
    } catch (err) {
      console.error("Evaluation Error:", err);
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
              {position || "AI Interview"}
            </Text>
            <Text style={styles.topBarSubText}>
              Question {questionNumber} of {totalQuestions}
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
                      <Text style={styles.aiSenderLabel}>AI Interviewer</Text>
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
                      ? "Evaluating your responses..."
                      : "Thinking..."}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Bottom Input Controls */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Type your response here..."
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