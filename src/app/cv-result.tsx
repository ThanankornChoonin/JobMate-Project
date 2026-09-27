/**
 * ============================================================================
 * หน้าจอ: แสดงผลการวิเคราะห์เรซูเม่ (CV Evaluation Result Screen)
 * ============================================================================
 * ไฟล์: src/app/cv-result.tsx
 *
 * ระบบ:
 * - แสดงคะแนน CV จาก AI
 * - แสดง Strengths
 * - แสดง Weaknesses
 * - แสดง Suggestions
 * - คะแนน >= 50 สามารถเข้าสัมภาษณ์ AI ได้
 * - คะแนน < 50 ไม่สามารถเข้าสัมภาษณ์ AI ได้
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useLanguage } from "../context/language-context";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

/**
 * แปลงข้อมูลที่อาจเป็น JSON String ให้เป็น Object
 */
function safeParse(value: any) {
  if (!value) return {};

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  return {};
}

/**
 * ทำให้ข้อมูลเป็น Array เสมอ
 */
function toArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => String(item));
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return [];
}

export default function CVResult() {
  const router = useRouter();
  const { t } = useLanguage();

  const { position, result } = useLocalSearchParams();

  /**
   * ==========================================================================
   * 1. อ่านผลลัพธ์จาก Backend
   * ==========================================================================
   */
  let response: any = {};

  try {
    response = result ? JSON.parse(result as string) : {};
  } catch (error) {
    console.error("CV Result JSON Parse Error:", error);
    response = {};
  }

  /**
   * ==========================================================================
   * 2. ดึงข้อมูล Analysis / Feedback
   * ==========================================================================
   *
   * รองรับหลายรูปแบบ เช่น
   *
   * response.analysis
   * response.feedback
   * response.data.analysis
   * response.data.feedback
   *
   * และกรณีที่ AI ส่งกลับมาเป็น JSON String
   */

  const dataObject = safeParse(response?.data);

  const analysis =
    safeParse(response?.analysis) ||
    safeParse(response?.feedback) ||
    safeParse(dataObject?.analysis) ||
    safeParse(dataObject?.feedback) ||
    {};

  /**
   * ==========================================================================
   * 3. ดึงคะแนน
   * ==========================================================================
   */

  const scoreCandidates = [
    response?.score,
    response?.analysis?.score,
    response?.feedback?.score,
    dataObject?.score,
    dataObject?.analysis?.score,
    dataObject?.feedback?.score,
    analysis?.score,
  ];

  let payloadScore = 0;

  for (const value of scoreCandidates) {
    const numberValue = Number(value);

    if (!Number.isNaN(numberValue)) {
      payloadScore = numberValue;
      break;
    }
  }

  /**
   * จำกัดคะแนนให้อยู่ระหว่าง 0-100
   */
  const score = Math.max(0, Math.min(100, payloadScore));

  /**
   * ==========================================================================
   * 4. ดึงข้อมูล Strengths / Weaknesses / Suggestions
   * ==========================================================================
   */

  const strengths = toArray(
    analysis?.strengths ??
      response?.strengths ??
      response?.data?.strengths
  );

  const weaknesses = toArray(
    analysis?.weaknesses ??
      response?.weaknesses ??
      response?.data?.weaknesses
  );

  const suggestions = toArray(
    analysis?.suggestions ??
      response?.suggestions ??
      response?.data?.suggestions
  );

  /**
   * ==========================================================================
   * 5. Status
   * ==========================================================================
   */

  const status =
    analysis?.status ||
    response?.status ||
    response?.data?.status ||
    (score >= 50 ? "Moderate Match" : "Weak Match");

  /**
   * ==========================================================================
   * 6. CV ID
   * ==========================================================================
   */

  const cvId =
    response?.cv_id ??
    dataObject?.cv_id ??
    response?.id ??
    "";

  /**
   * ==========================================================================
   * 7. คำถามสัมภาษณ์จาก AI
   * ==========================================================================
   */

  let questions: string[] = [];

  if (Array.isArray(response?.questions)) {
    questions = response.questions;
  } else if (Array.isArray(response?.questions?.questions)) {
    questions = response.questions.questions;
  } else if (Array.isArray(dataObject?.questions)) {
    questions = dataObject.questions;
  } else if (Array.isArray(analysis?.questions)) {
    questions = analysis.questions;
  }

  questions = questions.map((q) => String(q));

  /**
   * ==========================================================================
   * 8. ตรวจสอบว่าผ่านเกณฑ์หรือไม่
   * ==========================================================================
   *
   * คะแนน >= 50 = ผ่าน
   * คะแนน < 50 = ไม่ผ่าน
   */

  const isPassed = score >= 50;

  /**
   * ==========================================================================
   * 9. Animation ปุ่ม
   * ==========================================================================
   */

  const buttonScale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const onPressIn = () => {
    buttonScale.value = withSpring(0.96, {
      damping: 15,
    });
  };

  const onPressOut = () => {
    buttonScale.value = withSpring(1, {
      damping: 15,
    });
  };

  /**
   * ==========================================================================
   * UI
   * ==========================================================================
   */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================================================================
            HEADER
        ================================================================= */}

        <View style={styles.header}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isPassed ? "#DCFCE7" : "#FEE2E2",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isPassed ? "file-check" : "file-remove"}
              size={56}
              color={isPassed ? "#16A34A" : "#DC2626"}
            />
          </View>

          <Text style={styles.title}>
            {t.cvResult.title}
          </Text>

          {/* SCORE */}

          <View style={styles.scoreContainer}>
            <Text
              style={[
                styles.score,
                {
                  color: isPassed ? "#16A34A" : "#DC2626",
                },
              ]}
            >
              {score}
            </Text>

            <Text style={styles.scoreMax}>
              /100
            </Text>
          </View>

          {/* STATUS */}

          <View
            style={[
              styles.statusTag,
              {
                backgroundColor: isPassed
                  ? "#EFF6FF"
                  : "#FEF2F2",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isPassed
                    ? "#2563EB"
                    : "#DC2626",
                },
              ]}
            >
              {status}
            </Text>
          </View>

          {/* POSITION */}

          {position && (
            <View style={styles.positionBadge}>
              <MaterialCommunityIcons
                name="briefcase-outline"
                size={16}
                color="#64748B"
              />

              <Text style={styles.positionText}>
                {position}
              </Text>
            </View>
          )}
        </View>

        {/* ================================================================
            STRENGTHS
        ================================================================= */}

        {strengths.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconBg,
                  {
                    backgroundColor: "#DCFCE7",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={20}
                  color="#16A34A"
                />
              </View>

              <Text style={styles.sectionTitle}>
                {t.cvResult.strengths}
              </Text>
            </View>

            {strengths.map((item, index) => (
              <View
                key={`strength-${index}`}
                style={styles.listItem}
              >
                <Text
                  style={[
                    styles.bullet,
                    {
                      color: "#16A34A",
                    },
                  ]}
                >
                  •
                </Text>

                <Text style={styles.itemText}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ================================================================
            WEAKNESSES
        ================================================================= */}

        {weaknesses.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconBg,
                  {
                    backgroundColor: "#FEF3C7",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={20}
                  color="#D97706"
                />
              </View>

              <Text style={styles.sectionTitle}>
                {t.cvResult.weaknesses}
              </Text>
            </View>

            {weaknesses.map((item, index) => (
              <View
                key={`weakness-${index}`}
                style={styles.listItem}
              >
                <Text
                  style={[
                    styles.bullet,
                    {
                      color: "#D97706",
                    },
                  ]}
                >
                  •
                </Text>

                <Text style={styles.itemText}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ================================================================
            SUGGESTIONS
        ================================================================= */}

        {suggestions.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconBg,
                  {
                    backgroundColor: "#E0F2FE",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={20}
                  color="#0284C7"
                />
              </View>

              <Text style={styles.sectionTitle}>
                {t.cvResult.suggestions}
              </Text>
            </View>

            {suggestions.map((item, index) => (
              <View
                key={`suggestion-${index}`}
                style={styles.listItem}
              >
                <Text
                  style={[
                    styles.bullet,
                    {
                      color: "#0284C7",
                    },
                  ]}
                >
                  •
                </Text>

                <Text style={styles.itemText}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ================================================================
            ถ้า AI ไม่มี Weaknesses / Suggestions
        ================================================================= */}

        {weaknesses.length === 0 &&
          suggestions.length === 0 && (
            <View style={styles.warningCard}>
              <MaterialCommunityIcons
                name="information-outline"
                size={22}
                color="#D97706"
              />

              <Text style={styles.warningText}>
                AI ไม่ได้ส่งข้อมูลจุดที่ควรพัฒนาและข้อเสนอแนะกลับมา
              </Text>
            </View>
          )}

        {/* ================================================================
            ACTION
        ================================================================= */}

        {isPassed ? (
          <AnimatedTouchableOpacity
            style={[
              styles.primaryButton,
              animatedButtonStyle,
            ]}
            activeOpacity={0.9}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={() => {
              /**
               * ส่งข้อมูลไปหน้า Interview
               */
              router.push({
                pathname: "/interview",
                params: {
                  cv_id: cvId,
                  position: position,
                  questions: JSON.stringify(questions),
                },
              });
            }}
          >
            <Text style={styles.primaryButtonText}>
              {t.cvResult.startInterview}
            </Text>

            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color="white"
            />
          </AnimatedTouchableOpacity>
        ) : (
          <View style={styles.rejectedContainer}>
            {/* ============================================================
                REJECTED
            ============================================================= */}

            <View style={styles.rejectedBanner}>
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={36}
                color="#DC2626"
              />

              <Text style={styles.rejectedTitle}>
                {t.cvResult.rejectedTitle}
              </Text>

              <Text style={styles.rejectedSub}>
                {t.cvResult.rejectedSub}
              </Text>
            </View>

            {/* HOME */}

            <AnimatedTouchableOpacity
              style={[
                styles.homeButton,
                animatedButtonStyle,
              ]}
              activeOpacity={0.9}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={() =>
                router.replace("/home")
              }
            >
              <MaterialCommunityIcons
                name="home-outline"
                size={20}
                color="#0F172A"
              />

              <Text style={styles.homeButtonText}>
                {t.cvResult.home}
              </Text>
            </AnimatedTouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * ============================================================================
 * STYLES
 * ============================================================================
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    marginBottom: 24,
  },

  statusBadge: {
    width: 96,
    height: 96,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },

  scoreContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
  },

  score: {
    fontSize: 56,
    fontWeight: "800",
  },

  scoreMax: {
    fontSize: 20,
    fontWeight: "600",
    color: "#94A3B8",
    marginLeft: 2,
  },

  statusTag: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },

  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },

  positionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  positionText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",

    elevation: 2,

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },

  sectionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingRight: 10,
  },

  bullet: {
    fontSize: 18,
    marginRight: 8,
    lineHeight: 22,
  },

  itemText: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    flex: 1,
  },

  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 10,
  },

  warningText: {
    flex: 1,
    color: "#92400E",
    fontSize: 14,
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,

    elevation: 4,

    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },

  primaryButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "800",
  },

  rejectedContainer: {
    marginTop: 10,
    gap: 16,
  },

  rejectedBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },

  rejectedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#DC2626",
    marginTop: 8,
  },

  rejectedSub: {
    fontSize: 14,
    color: "#991B1B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  homeButton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  homeButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
});