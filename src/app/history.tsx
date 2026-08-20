import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function History() {
  const router = useRouter();
  const [cvGroupedHistory, setCvGroupedHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // 1. ดึงข้อมูลจาก cv_history
      const { data: cvData, error: cvError } = await supabase
        .from("cv_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // 2. ดึงข้อมูลจาก interview_history
      const { data: interviewData, error: interviewError } = await supabase
        .from("interview_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cvError) console.error("CV Fetch Error:", cvError);
      if (interviewError) console.error("Interview Fetch Error:", interviewError);

      const cvs = cvData || [];
      const interviews = interviewData || [];

      // ชุดเก็บ ID ของการสัมภาษณ์ที่ถูกแมตช์ไปแล้ว
      const matchedInterviewIds = new Set<any>();

      // 3. จัดกลุ่มโดยเทียบ cv_id หรือเทียบชื่อตำแหน่ง (position)
      const grouped = cvs.map((cv) => {
        const relatedInterviews = interviews.filter((interview) => {
          const isCvIdMatch =
            interview.cv_id !== null &&
            interview.cv_id !== undefined &&
            String(interview.cv_id) === String(cv.id);

          const isPositionMatch =
            (!interview.cv_id || String(interview.cv_id) === "0") &&
            interview.position &&
            cv.position &&
            interview.position.trim().toLowerCase() === cv.position.trim().toLowerCase();

          if (isCvIdMatch || isPositionMatch) {
            matchedInterviewIds.add(interview.id);
            return true;
          }
          return false;
        });

        return {
          ...cv,
          interviews: relatedInterviews,
        };
      });

      // 4. หากมีประวัติการสัมภาษณ์ที่ไม่ตรงกับ CV ใดๆ เลย ให้สร้างเป็น Card สัมภาษณ์เดี่ยวๆ
      const orphanInterviews = interviews.filter(
        (interview) => !matchedInterviewIds.has(interview.id)
      );

      const standaloneCards = orphanInterviews.map((interview) => ({
        id: `standalone_${interview.id}`,
        position: interview.position || "AI Interview Session",
        created_at: interview.created_at,
        score: interview.score ?? 0,
        is_passed: Number(interview.score) >= 50,
        isStandaloneInterview: true,
        interviews: [interview],
      }));

      setCvGroupedHistory([...grouped, ...standaloneCards]);
    } catch (err) {
      console.error("Load History Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCvPress = (item: any) => {
    const feedback = typeof item.feedback === "string" ? JSON.parse(item.feedback) : item.feedback;

    router.push({
      pathname: "/history-detail",
      params: {
        type: "cv",
        position: item.position,
        score: item.score,
        level: "CV Evaluation",
        strengths: JSON.stringify(feedback?.strengths || []),
        weaknesses: JSON.stringify(feedback?.weaknesses || []),
        suggestions: JSON.stringify(feedback?.summary || feedback?.suggestions || ""),
        conversation: JSON.stringify([]),
      },
    });
  };

  const handleInterviewPress = (interview: any) => {
    const processData = (raw: any) => {
      if (!raw) return [];
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw);
        } catch {
          return [raw];
        }
      }
      return raw;
    };

    const rawConversation =
      interview.conversation ||
      interview.chat_history ||
      interview.messages ||
      interview.history ||
      interview.transcript ||
      [];

    const parsedConversation = processData(rawConversation);
    const parsedStrengths = processData(interview.strengths);
    const parsedWeaknesses = processData(interview.weaknesses);
    const parsedSuggestions = processData(interview.suggestions || interview.feedback);

    router.push({
      pathname: "/history-detail",
      params: {
        type: "interview",
        position: interview.position || "Interview Report",
        score: interview.score ?? 0,
        level: interview.level || "Evaluated",
        strengths: JSON.stringify(parsedStrengths),
        weaknesses: JSON.stringify(parsedWeaknesses),
        suggestions: JSON.stringify(parsedSuggestions),
        conversation: JSON.stringify(parsedConversation),
      },
    });
  };

  const renderCvGroup = ({ item }: { item: any }) => {
    const isCvPassed = item.is_passed;

    return (
      <View style={styles.card}>
        {/* Header Section */}
        <TouchableOpacity
          style={styles.cardHeader}
          activeOpacity={0.7}
          onPress={() => {
            if (item.isStandaloneInterview) {
              handleInterviewPress(item.interviews[0]);
            } else {
              handleCvPress(item);
            }
          }}
        >
          <View style={styles.positionContainer}>
            <View
              style={[
                styles.iconBg,
                { backgroundColor: item.isStandaloneInterview ? "#F0FDF4" : "#EFF6FF" },
              ]}
            >
              <MaterialCommunityIcons
                name={item.isStandaloneInterview ? "account-voice" : "file-document-outline"}
                size={22}
                color={item.isStandaloneInterview ? "#16A34A" : "#2563EB"}
              />
            </View>
            <View style={styles.titleWrapper}>
              <Text style={styles.jobTitle} numberOfLines={1}>
                {item.position || "General Position"}
              </Text>

              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: item.isStandaloneInterview ? "#DCFCE7" : "#DBEAFE" },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: item.isStandaloneInterview ? "#15803D" : "#1E40AF" },
                    ]}
                  >
                    {item.isStandaloneInterview ? "AI Interview" : "CV Analysis"}
                  </Text>
                </View>

                <View style={styles.dateRow}>
                  <MaterialCommunityIcons
                    name="calendar-clock-outline"
                    size={14}
                    color="#94A3B8"
                  />
                  <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.scoreBadge,
              { backgroundColor: isCvPassed ? "#DCFCE7" : "#FEE2E2" },
            ]}
          >
            <Text
              style={[
                styles.scoreText,
                { color: isCvPassed ? "#16A34A" : "#DC2626" },
              ]}
            >
              {item.score ?? (isCvPassed ? "PASS" : "FAIL")}
            </Text>
            {item.score !== undefined && (
              <Text
                style={[
                  styles.scoreSub,
                  { color: isCvPassed ? "#16A34A" : "#DC2626" },
                ]}
              >
                /100
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* List of AI Interviews */}
        {item.interviews && item.interviews.length > 0 && (
          <View style={styles.interviewSection}>
            <Text style={styles.interviewSectionTitle}>💬 ประวัติการสัมภาษณ์ AI</Text>
            {item.interviews.map((interview: any) => {
              const isInterviewPassed = Number(interview.score) >= 50;
              return (
                <TouchableOpacity
                  key={interview.id}
                  style={styles.interviewBtn}
                  activeOpacity={0.8}
                  onPress={() => handleInterviewPress(interview)}
                >
                  <View style={styles.interviewLeft}>
                    <View style={styles.interviewIconBg}>
                      <MaterialCommunityIcons
                        name="forum"
                        size={20}
                        color="#2563EB"
                      />
                    </View>
                    <View style={styles.interviewTextWrapper}>
                      <Text style={styles.interviewTitleText}>
                        ดูบทสนทนาการสัมภาษณ์
                      </Text>
                      <Text style={styles.interviewSubText}>
                        ระดับ {interview.level || "Evaluated"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.interviewRight}>
                    <View
                      style={[
                        styles.interviewScorePill,
                        { backgroundColor: isInterviewPassed ? "#DCFCE7" : "#FEE2E2" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.interviewScorePillText,
                          { color: isInterviewPassed ? "#15803D" : "#B91C1C" },
                        ]}
                      >
                        {interview.score}/100
                      </Text>
                    </View>
                    <View style={styles.arrowCircle}>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Footer CV Button (ถ้าไม่ใช่สัมภาษณ์เดี่ยว) */}
        {!item.isStandaloneInterview && (
          <TouchableOpacity
            style={styles.viewCvButton}
            activeOpacity={0.8}
            onPress={() => handleCvPress(item)}
          >
            <MaterialCommunityIcons name="file-chart-outline" size={18} color="#2563EB" />
            <Text style={styles.viewDetailText}>ดูรายละเอียดผลการประเมิน CV</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#2563EB" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>History & Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={cvGroupedHistory}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderCvGroup}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={48}
                  color="#94A3B8"
                />
              </View>
              <Text style={styles.emptyTitle}>No History Found</Text>
              <Text style={styles.emptySub}>
                You haven't uploaded any CV or completed any interviews yet.
              </Text>
            </View>
          }
        />
      )}
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
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
  },
  positionContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  iconBg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  titleWrapper: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 54,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 18,
  },
  scoreSub: {
    fontSize: 10,
    fontWeight: "600",
  },
  interviewSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  interviewSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  interviewBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  interviewLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  interviewIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
  },
  interviewTextWrapper: {
    flex: 1,
  },
  interviewTitleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0369A1",
  },
  interviewSubText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  interviewRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  interviewScorePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  interviewScorePillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0284C7",
    justifyContent: "center",
    alignItems: "center",
  },
  viewCvButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});