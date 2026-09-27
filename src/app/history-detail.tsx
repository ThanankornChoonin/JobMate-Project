/**
 * ============================================================================
 * หน้าจอ: รายละเอียดประวัติย้อนหลัง (History Detail Screen)
 * ============================================================================
 * ไฟล์: src/app/history-detail.tsx
 *
 * รายละเอียด:
 * - แสดงรายละเอียดผลการประเมินย้อนหลัง ทั้งแบบ CV Review และ AI Interview
 * - รับพารามิเตอร์ผ่าน URL params: type, position, score, level, status, strengths, weaknesses, suggestions, conversation
 * - กรณีเป็นผลตรวจ CV: แสดงการ์ดสถานะการสมัครงาน (Application Status) ที่อัปเดตโดย HR
 * - กรณีเป็นผลสัมภาษณ์: แสดงบทสนทนาโต้ตอบระหว่าง AI กับผู้สมัครในอดีต (Chat History)
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useLanguage } from "../context/language-context";

/**
 * คอมโพเนนต์หลักของหน้ารายละเอียดประวัติ
 */
export default function HistoryDetail() {
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams();

  const type = (params.type as string) || "interview";
  const position = (params.position as string) || t.historyDetail.generalPosition;
  const score = Number(params.score) || 0;
  const level = (params.level as string) || t.historyDetail.evaluated;
  const status = (params.status as string) || "new";

  /**
   * ฟังก์ชันช่วยแปลงข้อมูล String JSON กลับเป็น Array หรือ Object
   *
   * @param data ข้อมูลดิบที่อาจเป็น JSON string หรือโครงสร้างอื่น
   * @returns ข้อมูลที่ parse เรียบร้อยแล้ว
   */
  const parseData = (data: any) => {
    if (!data) return [];
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return [data];
      }
    }
    return data;
  };

  const strengths: string[] = parseData(params.strengths);
  const weaknesses: string[] = parseData(params.weaknesses);
  const suggestions: string[] = parseData(params.suggestions);
  const conversation: any[] = parseData(params.conversation);

  const isPassed = score >= 50;

  const getStatusDetailConfig = (statusKey: string) => {
    switch (statusKey) {
      case "interview":
        return {
          title: t.historyDetail.statuses.interview,
          description: t.historyDetail.statusDescriptions.interview,
          color: "#7C3AED",
          bg: "#EDE9FE",
          border: "#DDD6FE",
          icon: "calendar-clock-outline" as const,
        };
      case "passed":
        return {
          title: t.historyDetail.statuses.passed,
          description: t.historyDetail.statusDescriptions.passed,
          color: "#16A34A",
          bg: "#DCFCE7",
          border: "#BBF7D0",
          icon: "check-circle-outline" as const,
        };
      case "rejected":
        return {
          title: t.historyDetail.statuses.rejected,
          description: t.historyDetail.statusDescriptions.rejected,
          color: "#DC2626",
          bg: "#FEE2E2",
          border: "#FECACA",
          icon: "close-circle-outline" as const,
        };
      case "reviewing":
        return {
          title: t.historyDetail.statuses.reviewing,
          description: t.historyDetail.statusDescriptions.reviewing,
          color: "#D97706",
          bg: "#FEF3C7",
          border: "#FDE68A",
          icon: "file-search-outline" as const,
        };
      case "new":
      default:
        return {
          title: t.historyDetail.statuses.new,
          description: t.historyDetail.statusDescriptions.new,
          color: "#0284C7",
          bg: "#E0F2FE",
          border: "#BAE6FD",
          icon: "email-check-outline" as const,
        };
    }
  };

  const statusDetail = getStatusDetailConfig(status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {type === "cv" ? t.historyDetail.cvTitle : t.historyDetail.interviewTitle}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Application Status Card (for CV reviews) */}
        {type === "cv" && (
          <View style={[styles.statusCard, { backgroundColor: statusDetail.bg, borderColor: statusDetail.border }]}>
            <View style={styles.statusCardHeader}>
              <View style={[styles.statusIconCircle, { backgroundColor: statusDetail.color }]}>
                <MaterialCommunityIcons name={statusDetail.icon} size={22} color="#FFFFFF" />
              </View>
              <View style={styles.statusTitleWrapper}>
                <Text style={styles.statusEyebrow}>{t.historyDetail.applicationStatus}</Text>
                <Text style={[styles.statusTitle, { color: statusDetail.color }]}>
                  {statusDetail.title}
                </Text>
              </View>
            </View>
            <Text style={styles.statusDescription}>{statusDetail.description}</Text>
          </View>
        )}

        {/* Score & Position Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerInfo}>
            <Text style={styles.positionText}>{position}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: type === "cv" ? "#FEF3C7" : isPassed ? "#DCFCE7" : "#FEE2E2" },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: type === "cv" ? "#D97706" : isPassed ? "#16A34A" : "#DC2626" },
                ]}
              >
                {type === "cv" ? t.historyDetail.cvEvaluation : level}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.scoreCircle,
              { borderColor: isPassed ? "#16A34A" : "#DC2626" },
            ]}
          >
            <Text
              style={[
                styles.scoreNumber,
                { color: isPassed ? "#16A34A" : "#DC2626" },
              ]}
            >
              {score}
            </Text>
            <Text style={styles.scoreSub}>/100</Text>
          </View>
        </View>

        {/* จุดแข็ง (Strengths) */}
        {strengths.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#16A34A" />
              <Text style={[styles.sectionTitle, { color: "#16A34A" }]}>
                {t.historyDetail.strengths}
              </Text>
            </View>
            {strengths.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* จุดควรพัฒนา (Weaknesses) */}
        {weaknesses.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#D97706" />
              <Text style={[styles.sectionTitle, { color: "#D97706" }]}>
                {t.historyDetail.weaknesses}
              </Text>
            </View>
            {weaknesses.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* คำแนะนำเพิ่มเติม (Suggestions) */}
        {suggestions.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#2563EB" />
              <Text style={[styles.sectionTitle, { color: "#2563EB" }]}>
                {t.historyDetail.suggestions}
              </Text>
            </View>
            {suggestions.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ประวัติการสัมภาษณ์กับ AI (แสดงเฉพาะประเภท interview) */}
        {type === "interview" && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="forum-outline" size={20} color="#7C3AED" />
              <Text style={[styles.sectionTitle, { color: "#7C3AED" }]}>
                {t.historyDetail.interviewHistory}
              </Text>
            </View>

            {conversation && conversation.length > 0 ? (
              <View style={styles.chatList}>
                {conversation.map((msg, index) => {
                  const isUser = msg.sender === "user";
                  return (
                    <View
                      key={index}
                      style={[
                        styles.chatBubble,
                        isUser ? styles.userBubble : styles.aiBubble,
                      ]}
                    >
                      <Text style={isUser ? styles.userLabel : styles.aiLabel}>
                        {isUser ? t.historyDetail.you : t.historyDetail.interviewer}
                      </Text>
                      <Text style={isUser ? styles.userText : styles.aiText}>
                        {msg.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyChat}>
                <MaterialCommunityIcons name="chat-remove-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptyChatText}>{t.historyDetail.emptyChat}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  statusCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  statusIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  statusTitleWrapper: {
    flex: 1,
  },
  statusEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  statusDescription: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  headerInfo: {
    flex: 1,
    paddingRight: 12,
  },
  positionText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 22,
  },
  scoreSub: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    paddingRight: 8,
  },
  bulletDot: {
    fontSize: 14,
    color: "#64748B",
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    flex: 1,
  },
  chatList: {
    gap: 10,
    marginTop: 8,
  },
  chatBubble: {
    padding: 12,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: "#EFF6FF",
    alignSelf: "flex-end",
    maxWidth: "85%",
  },
  aiBubble: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignSelf: "flex-start",
    maxWidth: "85%",
  },
  userLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 2,
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 2,
  },
  userText: {
    fontSize: 14,
    color: "#1E3A8A",
  },
  aiText: {
    fontSize: 14,
    color: "#0F172A",
  },
  emptyChat: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyChatText: {
    fontSize: 13,
    color: "#94A3B8",
  },
});