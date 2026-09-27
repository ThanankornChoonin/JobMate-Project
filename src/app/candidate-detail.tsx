/**
 * ============================================================================
 * หน้าจอ: รายละเอียดใบสมัครและผลการประเมินของผู้สมัคร (Candidate Detail Screen)
 * ============================================================================
 * ไฟล์: src/app/candidate-detail.tsx
 *
 * รายละเอียด:
 * - แสดงข้อมูลใบสมัครงานของผู้สมัครอย่างละเอียดแบบรอบด้าน สำหรับทีม HR
 * - แสดงคะแนนคู่ (Dual Score Cards): คะแนนวิเคราะห์ CV และคะแนนการสัมภาษณ์ AI
 * - แสดงรายการจุดแข็ง, จุดควรพัฒนา, และข้อเสนอแนะ ทั้งจากการตรวจ CV และการสัมภาษณ์ AI
 * - แสดงบทสนทนาย้อนหลัง (Transcript) ระหว่าง AI กับผู้สมัครแบบพับ/ขยายได้ (Accordion)
 * - มีระบบปรับสถานะใบสมัครงาน (Status) พร้อมระบบยืนยัน (Confirmation Dialog)
 * - มีระบบบันทึกโน้ตภายในทีม HR (Internal Team Notes) ที่เก็บในตาราง `candidate_notes`
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

/**
 * ข้อมูล CV ที่ดึงจากตาราง cv_history
 */
type Candidate = {
  id: number;
  user_id: string;
  position: string | null;
  score: number | null;
  is_passed: boolean | null;
  status: string | null;
  created_at: string;
  feedback: unknown;
  file_url?: string | null; // 👈 URL ไฟล์ PDF บน Supabase Storage
};

/**
 * ข้อมูลผลการสัมภาษณ์ AI จากตาราง interview_history
 */
type InterviewRecord = {
  score: number | null;
  level: string | null;
  strengths: unknown;
  weaknesses: unknown;
  suggestions: unknown;
  conversation: string | null;
  created_at: string;
};

/**
 * โน้ตภายในทีม HR ที่บันทึกไว้สำหรับผู้สมัครรายนี้
 */
type Note = { id: number; body: string; created_at: string };

/**
 * สถานะการคัดเลือกและป้ายกำกับภาษาไทย
 */
const statuses = ["new", "reviewing", "interview", "passed", "rejected"] as const;
const statusText: Record<string, string> = { new: "New", reviewing: "Under Review", interview: "Interview", passed: "Passed", rejected: "Rejected" };

/**
 * ฟังก์ชันช่วยแปลงข้อมูล JSON หรือ Array จาก AI ให้อยู่ในรูป Array ของ String เสมอ
 *
 * @param value ข้อมูลที่อาจเป็น string, array, หรือ JSON string
 * @returns Array ของ String
 */
const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  try { return toList(JSON.parse(value)); } catch { return value ? [value] : []; }
};

/**
 * โครงสร้างข้อความแชต
 */
type ChatMessage = { sender: string; text: string };

/**
 * แปลง conversation จาก JSON string เป็น Array ของข้อความแชต
 *
 * @param raw ข้อมูลสตริงดิบของบทสนทนา
 * @returns รายการข้อความแชต ChatMessage[]
 */
const parseConversation = (raw: string | null): ChatMessage[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((m: any) => m.sender && m.text);
    return [];
  } catch {
    return [];
  }
};

/**
 * คอมโพเนนต์หลักของหน้ารายละเอียดผู้สมัคร
 */
export default function CandidateDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [interview, setInterview] = useState<InterviewRecord | null>(null);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  /**
   * โหลดข้อมูลใบสมัครของผู้สมัครรายนี้
   * รวมทั้งอีเมลจาก profiles, โน้ตภายในจาก candidate_notes, และผลการสัมภาษณ์ AI
   */
  const loadCandidate = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("cv_history")
      .select("id, user_id, position, score, is_passed, status, created_at, feedback, file_url")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      Alert.alert("Data Not Found", "Unable to load candidate information.");
      router.back();
      return;
    }

    const item = data as Candidate;
    setCandidate(item);

    const interviewPromise = fetch(`http://localhost:3000/cv/interviews?user_id=${item.user_id}`)
      .then((res) => res.json())
      .then((json) => (json.success && Array.isArray(json.data) ? { data: json.data } : { data: [] }))
      .catch(() =>
        supabase
          .from("interview_history")
          .select("score, level, strengths, weaknesses, suggestions, conversation, created_at, cv_id, user_id, position")
          .eq("user_id", item.user_id)
          .order("created_at", { ascending: false })
      );

    const [profileResult, noteResult, interviewResult] = await Promise.all([
      supabase.from("profiles").select("email").eq("id", item.user_id).maybeSingle(),
      supabase.from("candidate_notes").select("id, body, created_at").eq("cv_id", String(item.id)).order("created_at", { ascending: false }),
      interviewPromise,
    ]);

    const interviewList = (interviewResult.data as any[]) || [];
    const matchedInterview = interviewList.find((i) =>
      (i.cv_id && String(i.cv_id) === String(item.id)) ||
      (!i.cv_id && i.position === item.position)
    ) || (interviewList.length > 0 ? interviewList[0] : null);

    setEmail(profileResult.data?.email ?? "No email provided");
    setNotes((noteResult.data as Note[]) ?? []);
    setInterview(matchedInterview as InterviewRecord ?? null);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { void loadCandidate(); }, [loadCandidate]);

  /**
   * ยืนยันและบันทึกสถานะการคัดเลือกใหม่ (new, reviewing, interview, passed, rejected)
   *
   * @param status สถานะที่ต้องการเปลี่ยน
   */
  const updateStatus = (status: string) => {
    Alert.alert("Confirm Status Change", `Change status to "${statusText[status]}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Save",
        onPress: async () => {
          if (!candidate) return;
          try {
            const res = await fetch("http://localhost:3000/cv/status", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cv_id: candidate.id, status }),
            });
            const json = await res.json();
            if (json.success) {
              setCandidate({ ...candidate, status });
              Alert.alert("Success", `Status updated to "${statusText[status]}".`);
              return;
            }
          } catch (e) {
            console.warn("Backend status update fallback to Supabase direct...");
          }

          // Fallback Supabase direct update
          const { error } = await supabase.from("cv_history").update({ status }).eq("id", candidate.id);
          if (error) {
            Alert.alert("Error", error.message);
          } else {
            setCandidate({ ...candidate, status });

            // สร้างการแจ้งเตือน fallback ไปยังตาราง notifications ของผู้สมัคร
            try {
              const pos = candidate.position || "Applied Role";
              const notifTitles: Record<string, string> = {
                new: "📄 Application Received",
                reviewing: "🔍 Under Review",
                interview: "🎉 Shortlisted for Interview",
                passed: "🏆 Congratulations! Selected",
                rejected: "📢 Application Update",
              };
              const notifMsgs: Record<string, string> = {
                new: `Your application for "${pos}" has been successfully received.`,
                reviewing: `Our HR team is currently reviewing your application for "${pos}".`,
                interview: `Congratulations! You have been shortlisted for an interview for "${pos}".`,
                passed: `Congratulations! You have been selected for the "${pos}" role. HR will contact you shortly.`,
                rejected: `Thank you for your interest in the "${pos}" position. We have decided to move forward with other candidates at this time.`,
              };
              const payload = {
                user_id: candidate.user_id,
                title: notifTitles[status] || "📢 Application Status Update",
                message: notifMsgs[status] || `Your application for "${pos}" has been updated to "${statusText[status] || status}".`,
                type: "status_update",
                related_cv_id: candidate.id ? String(candidate.id) : null,
                is_read: false,
              };
              const { error: notifErr } = await supabase.from("notifications").insert([payload]);
              if (notifErr) {
                // หาก column related_cv_id ยังเป็น bigint ใน database ให้ fallback insert โดยส่ง null
                await supabase.from("notifications").insert([{ ...payload, related_cv_id: null }]);
              }
            } catch (err) {
              console.warn("[Notification Fallback Catch]", err);
            }

            Alert.alert("Success", `Status updated to "${statusText[status]}".`);
          }
        },
      },
    ]);
  };

  /**
   * บันทึกโน้ตข้อความใหม่ภายในทีม HR สำหรับผู้สมัครรายนี้
   */
  const addNote = async () => {
    if (!candidate || !note.trim() || saving) return;
    setSaving(true);

    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("candidate_notes").insert({
      cv_id: String(candidate.id),
      candidate_id: candidate.user_id,
      body: note.trim(),
      created_by: auth.user?.id ?? null,
    });

    setSaving(false);
    if (error) {
      Alert.alert("Failed to save note", "Please check that database setup is up to date.");
      return;
    }

    setNote("");
    void loadCandidate();
  };

  if (loading || !candidate) {
    return <SafeAreaView style={styles.container}><View style={styles.center}><ActivityIndicator size="large" color="#DC2626" /></View></SafeAreaView>;
  }

  // แปลงผลวิเคราะห์ AI (จาก CV) เป็นข้อมูลพร้อมแสดงผล
  const feedback = typeof candidate.feedback === "string"
    ? (() => { try { return JSON.parse(candidate.feedback); } catch { return {}; } })()
    : (candidate.feedback ?? {});
  const cvStrengths = toList((feedback as any).strengths);
  const cvWeaknesses = toList((feedback as any).weaknesses);
  const cvSummary = toList((feedback as any).summary ?? (feedback as any).suggestions);
  const status = candidate.status || "new";

  // ตรวจสอบว่า CV ผ่านหรือไม่
  const isCvPassed = candidate.is_passed !== false && Number(candidate.score ?? 0) >= 50;

  // แปลงผลวิเคราะห์จากสัมภาษณ์ AI
  const interviewStrengths = interview ? toList(interview.strengths) : [];
  const interviewWeaknesses = interview ? toList(interview.weaknesses) : [];
  const interviewSuggestions = interview ? toList(interview.suggestions) : [];
  const chatMessages = interview ? parseConversation(interview.conversation) : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" /></TouchableOpacity>
        <View><Text style={styles.eyebrow}>TONYOURTIRES • HR SYSTEM</Text><Text style={styles.title}>Candidate Details</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ภาพรวมผู้สมัคร */}
        <View style={styles.hero}>
          <View style={styles.avatar}><MaterialCommunityIcons name="account-outline" size={30} color="#B91C1C" /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.position}>{candidate.position || "General candidate"}</Text>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.date}>Submitted on {new Date(candidate.created_at).toLocaleDateString("en-US")}</Text>
          </View>
        </View>

        {/* เอกสาร CV ต้นฉบับที่ผู้สมัครอัปโหลดขึ้น Supabase Storage */}
        {candidate.file_url ? (
          <TouchableOpacity
            style={styles.cvFileCard}
            onPress={() => Linking.openURL(candidate.file_url!)}
            activeOpacity={0.8}
          >
            <View style={styles.cvFileIconWrap}>
              <MaterialCommunityIcons name="file-pdf-box" size={30} color="#DC2626" />
            </View>
            <View style={styles.cvFileInfo}>
              <Text style={styles.cvFileTitle}>Original CV Document (PDF)</Text>
              <Text style={styles.cvFileSubtitle}>Click to view candidate's uploaded file</Text>
            </View>
            <View style={styles.cvFileOpenBadge}>
              <Text style={styles.cvFileOpenText}>View</Text>
              <MaterialCommunityIcons name="open-in-new" size={16} color="#2563EB" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.noCvFileCard}>
            <MaterialCommunityIcons name="file-hidden" size={20} color="#94A3B8" />
            <Text style={styles.noCvFileText}>No PDF file attached for this application.</Text>
          </View>
        )}

        {/* แสดงคะแนนคู่: CV Score + Interview Score */}
        <View style={styles.dualScoreContainer}>
          {/* คะแนน CV */}
          <View style={[styles.scoreCard, { borderColor: isCvPassed ? "#BBF7D0" : "#FECACA" }]}>
            <View style={[styles.scoreIconWrap, { backgroundColor: isCvPassed ? "#DCFCE7" : "#FEE2E2" }]}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color={isCvPassed ? "#15803D" : "#DC2626"} />
            </View>
            <Text style={styles.scoreLabel}>CV Screening Score</Text>
            <Text style={[styles.scoreValue, { color: isCvPassed ? "#15803D" : "#DC2626" }]}>
              {candidate.score ?? 0}<Text style={styles.scoreMax}>/100</Text>
            </Text>
            <View style={[styles.scoreBadge, { backgroundColor: isCvPassed ? "#DCFCE7" : "#FEE2E2" }]}>
              <Text style={[styles.scoreBadgeText, { color: isCvPassed ? "#15803D" : "#DC2626" }]}>
                {isCvPassed ? "Passed" : "Not Passed"}
              </Text>
            </View>
          </View>

          {/* คะแนนสัมภาษณ์ AI */}
          <View style={[styles.scoreCard, { borderColor: !isCvPassed ? "#E2E8F0" : interview ? "#BFDBFE" : "#E2E8F0" }]}>
            <View style={[styles.scoreIconWrap, { backgroundColor: !isCvPassed ? "#FEE2E2" : interview ? "#DBEAFE" : "#F1F5F9" }]}>
              <MaterialCommunityIcons
                name={!isCvPassed ? "close-circle-outline" : interview ? "microphone-outline" : "clock-outline"}
                size={22}
                color={!isCvPassed ? "#DC2626" : interview ? "#2563EB" : "#94A3B8"}
              />
            </View>
            <Text style={styles.scoreLabel}>AI Interview Score</Text>
            {!isCvPassed ? (
              <Text style={styles.notEligibleText}>No Interview</Text>
            ) : interview ? (
              <>
                <Text style={[styles.scoreValue, { color: Number(interview.score ?? 0) >= 50 ? "#2563EB" : "#DC2626" }]}>
                  {interview.score ?? 0}<Text style={styles.scoreMax}>/100</Text>
                </Text>
                {interview.level ? (
                  <View style={[styles.scoreBadge, { backgroundColor: "#DBEAFE" }]}>
                    <Text style={[styles.scoreBadgeText, { color: "#2563EB" }]}>{interview.level}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.waitingText}>Pending Interview</Text>
            )}
          </View>
        </View>

        {/* แจ้งเตือนว่า CV ไม่ผ่าน */}
        {!isCvPassed && (
          <View style={styles.alertBanner}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.alertText}>Candidate did not pass CV screening (score &lt; 50) and was not invited for AI interview.</Text>
          </View>
        )}

        <Text style={styles.heading}>Application Status</Text>
        <View style={styles.statuses}>
          {statuses.map((item) => <TouchableOpacity key={item} onPress={() => updateStatus(item)} style={[styles.status, status === item && styles.statusActive]}><Text style={[styles.statusText, status === item && styles.statusTextActive]}>{statusText[item]}</Text></TouchableOpacity>)}
        </View>

        {/* ผลวิเคราะห์ CV จาก AI */}
        <Text style={styles.sectionHeading}>📄 CV Analysis Insights</Text>
        <InsightCard title="Strengths (CV)" icon="check-circle-outline" color="#16A34A" items={cvStrengths} empty="No strengths data available" />
        <InsightCard title="Areas for Improvement (CV)" icon="alert-circle-outline" color="#D97706" items={cvWeaknesses} empty="No data available" />
        <InsightCard title="AI Summary (CV)" icon="lightbulb-outline" color="#2563EB" items={cvSummary} empty="No summary available" />

        {/* ผลวิเคราะห์สัมภาษณ์ AI (แสดงเฉพาะเมื่อมีข้อมูล) */}
        {interview && isCvPassed && (
          <>
            <Text style={styles.sectionHeading}>🎤 AI Interview Insights</Text>
            <InsightCard title="Strengths (Interview)" icon="check-circle-outline" color="#059669" items={interviewStrengths} empty="No data available" />
            <InsightCard title="Areas for Improvement (Interview)" icon="alert-circle-outline" color="#EA580C" items={interviewWeaknesses} empty="No data available" />
            <InsightCard title="Recommendations (Interview)" icon="lightbulb-outline" color="#7C3AED" items={interviewSuggestions} empty="No data available" />
          </>
        )}

        {/* บทสนทนาสัมภาษณ์ AI */}
        {interview && isCvPassed && chatMessages.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.transcriptHeader} onPress={() => setShowTranscript(!showTranscript)}>
              <View style={styles.sectionTitle}>
                <MaterialCommunityIcons name="chat-processing-outline" size={20} color="#6366F1" />
                <Text style={styles.headingNoMargin}>AI Interview Transcript</Text>
              </View>
              <MaterialCommunityIcons name={showTranscript ? "chevron-up" : "chevron-down"} size={22} color="#94A3B8" />
            </TouchableOpacity>
            <Text style={styles.transcriptMeta}>{chatMessages.length} messages • {interview.created_at ? new Date(interview.created_at).toLocaleDateString("en-US") : ""}</Text>
            {showTranscript && (
              <View style={styles.chatContainer}>
                {chatMessages.map((msg, idx) => (
                  <View key={idx} style={[styles.chatBubbleWrap, msg.sender === "ai" ? styles.chatLeft : styles.chatRight]}>
                    <View style={[styles.chatBubble, msg.sender === "ai" ? styles.chatBubbleAI : styles.chatBubbleUser]}>
                      <Text style={styles.chatSender}>{msg.sender === "ai" ? "🤖 AI" : "👤 Candidate"}</Text>
                      <Text style={[styles.chatText, msg.sender === "ai" ? styles.chatTextAI : styles.chatTextUser]}>{msg.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ส่วนนี้เป็นโน้ตที่มองเห็นได้เฉพาะทีม HR/Admin */}
        <View style={styles.section}>
          <View style={styles.sectionTitle}><MaterialCommunityIcons name="note-text-outline" size={20} color="#7C3AED" /><Text style={styles.headingNoMargin}>Internal Team Notes</Text></View>
          <TextInput value={note} onChangeText={setNote} placeholder="Add internal note for HR team..." placeholderTextColor="#94A3B8" style={styles.noteInput} multiline textAlignVertical="top" />
          <TouchableOpacity style={[styles.saveButton, (!note.trim() || saving) && styles.saveDisabled]} disabled={!note.trim() || saving} onPress={addNote}><Text style={styles.saveText}>{saving ? "Saving..." : "Save Note"}</Text></TouchableOpacity>
          {notes.map((item) => <View style={styles.note} key={item.id}><Text style={styles.noteBody}>{item.body}</Text><Text style={styles.noteDate}>{new Date(item.created_at).toLocaleString("en-US")}</Text></View>)}
          {!notes.length && <Text style={styles.empty}>No internal notes yet</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * คอมโพเนนต์การ์ดแสดงรายการ Insight ที่วิเคราะห์ได้จาก AI
 *
 * @param title หัวข้อการ์ด (เช่น จุดแข็ง, จุดควรพัฒนา, ข้อเสนอแนะ)
 * @param icon ชื่อไอคอนจาก MaterialCommunityIcons
 * @param color ธีมสีของหัวข้อและ bullet
 * @param items รายการข้อความ
 * @param empty ข้อความแสดงเมื่อไม่มีรายการ
 */
function InsightCard({ title, icon, color, items, empty }: { title: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; items: string[]; empty: string }) {
  return <View style={styles.section}><View style={styles.sectionTitle}><MaterialCommunityIcons name={icon} size={20} color={color} /><Text style={styles.headingNoMargin}>{title}</Text></View>{items.length ? items.map((item, index) => <View style={styles.bullet} key={`${item}-${index}`}><Text style={[styles.dot, { color }]}>•</Text><Text style={styles.bulletText}>{item}</Text></View>) : <Text style={styles.empty}>{empty}</Text>}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" }, center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { backgroundColor: "#111827", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, flexDirection: "row", alignItems: "center" },
  back: { backgroundColor: "#374151", width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 13 },
  eyebrow: { color: "#FCA5A5", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }, title: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginTop: 3 },
  content: { padding: 16, paddingBottom: 42 }, hero: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", padding: 16, flexDirection: "row", alignItems: "center" },
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginRight: 12 }, heroCopy: { flex: 1 },
  position: { fontSize: 17, fontWeight: "800", color: "#0F172A" }, email: { fontSize: 12, color: "#475569", marginTop: 3 }, date: { fontSize: 11, color: "#94A3B8", marginTop: 3 },

  // การ์ดไฟล์ CV ต้นฉบับ
  cvFileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cvFileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  cvFileInfo: {
    flex: 1,
  },
  cvFileTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  cvFileSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  cvFileOpenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  cvFileOpenText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  noCvFileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noCvFileText: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
  },

  // คะแนนคู่ (CV + Interview)
  dualScoreContainer: { flexDirection: "row", gap: 10, marginTop: 14 },
  scoreCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, padding: 14, alignItems: "center" },
  scoreIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  scoreLabel: { fontSize: 12, color: "#64748B", fontWeight: "600", marginBottom: 4 },
  scoreValue: { fontSize: 26, fontWeight: "800" },
  scoreMax: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  scoreBadge: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  scoreBadgeText: { fontSize: 11, fontWeight: "700" },
  notEligibleText: { fontSize: 13, color: "#DC2626", fontWeight: "700", textAlign: "center", marginTop: 4 },
  waitingText: { fontSize: 13, color: "#94A3B8", fontStyle: "italic", marginTop: 4 },

  // Alert banner
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 12, padding: 12, marginTop: 12 },
  alertText: { flex: 1, color: "#991B1B", fontSize: 12, lineHeight: 18 },

  heading: { color: "#0F172A", fontSize: 16, fontWeight: "800", marginTop: 22, marginBottom: 10 }, headingNoMargin: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  sectionHeading: { color: "#0F172A", fontSize: 17, fontWeight: "800", marginTop: 24, marginBottom: 4 },
  statuses: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, status: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10, backgroundColor: "#E2E8F0" }, statusActive: { backgroundColor: "#DC2626" }, statusText: { color: "#475569", fontWeight: "700", fontSize: 12 }, statusTextActive: { color: "#FFFFFF" },
  section: { backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#E2E8F0", padding: 16, marginTop: 16 }, sectionTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 11 },
  bullet: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7 }, dot: { marginRight: 8, fontSize: 16, lineHeight: 20 }, bulletText: { flex: 1, color: "#334155", fontSize: 13, lineHeight: 20 }, empty: { color: "#94A3B8", fontSize: 13 },
  noteInput: { minHeight: 86, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, color: "#0F172A", padding: 12, fontSize: 13, marginBottom: 10 }, saveButton: { alignSelf: "flex-start", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: "#7C3AED" }, saveDisabled: { backgroundColor: "#C4B5FD" }, saveText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  note: { marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" }, noteBody: { color: "#334155", fontSize: 13, lineHeight: 19 }, noteDate: { color: "#94A3B8", fontSize: 10, marginTop: 5 },

  // บทสนทนาสัมภาษณ์
  transcriptHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  transcriptMeta: { color: "#94A3B8", fontSize: 11, marginBottom: 4 },
  chatContainer: { marginTop: 8 },
  chatBubbleWrap: { marginBottom: 8 },
  chatLeft: { alignItems: "flex-start" },
  chatRight: { alignItems: "flex-end" },
  chatBubble: { maxWidth: "85%", borderRadius: 14, padding: 11 },
  chatBubbleAI: { backgroundColor: "#F1F5F9", borderBottomLeftRadius: 4 },
  chatBubbleUser: { backgroundColor: "#EFF6FF", borderBottomRightRadius: 4 },
  chatSender: { fontSize: 10, fontWeight: "700", color: "#64748B", marginBottom: 3 },
  chatText: { fontSize: 13, lineHeight: 19 },
  chatTextAI: { color: "#1E293B" },
  chatTextUser: { color: "#1E40AF" },
});
