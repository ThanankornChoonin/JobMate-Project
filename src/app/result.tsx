import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function Result() {
  const router = useRouter();
  const { result } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    score: 0,
    level: "",
    strengths: [] as string[],
    weaknesses: [] as string[],
    suggestions: [] as string[],
    position: "",
    created_at: "",
  });

  useEffect(() => {
    if (result) {
      try {
        const interview = JSON.parse(result as string);
        setData({
          score: interview.score || 0,
          level: interview.level || "",
          strengths: Array.isArray(interview.strengths) ? interview.strengths : [],
          weaknesses: Array.isArray(interview.weaknesses) ? interview.weaknesses : [],
          suggestions: Array.isArray(interview.suggestions) ? interview.suggestions : [],
          position: interview.position || "General Candidate",
          created_at: interview.created_at || new Date().toISOString(),
        });
      } catch (e) {
        console.error("Error parsing result param:", e);
      } finally {
        setLoading(false);
      }
    } else {
      loadLatestResult();
    }
  }, [result]);

  const loadLatestResult = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: latest } = await supabase
        .from("interview_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        setData({
          score: latest.score || 0,
          level: latest.level || "",
          strengths: typeof latest.strengths === "string" ? JSON.parse(latest.strengths || "[]") : (latest.strengths || []),
          weaknesses: typeof latest.weaknesses === "string" ? JSON.parse(latest.weaknesses || "[]") : (latest.weaknesses || []),
          suggestions: typeof latest.suggestions === "string" ? JSON.parse(latest.suggestions || "[]") : (latest.suggestions || []),
          position: latest.position || "General Candidate",
          created_at: latest.created_at || "",
        });
      }
    } catch (e) {
      console.error("Error loading latest result:", e);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#16A34A";
    if (score >= 60) return "#2563EB";
    if (score >= 40) return "#D97706";
    return "#DC2626";
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Analyzing Interview Results...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/home")}>
          <MaterialCommunityIcons name="close" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Assessment Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {!data.level ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBadge}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={56} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Assessment Found</Text>
            <Text style={styles.emptySub}>
              Complete an AI interview session to unlock your detailed score and feedback report.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace("/home")}>
              <Text style={styles.primaryBtnText}>Start New Interview</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Report Body */
          <>
            {/* Score Banner Header */}
            <View style={styles.scoreHeaderCard}>
              <View style={styles.metaRow}>
                {data.position ? (
                  <View style={styles.positionBadge}>
                    <MaterialCommunityIcons name="briefcase-outline" size={14} color="#2563EB" />
                    <Text style={styles.positionText}>{data.position}</Text>
                  </View>
                ) : null}
                {data.created_at ? (
                  <Text style={styles.dateText}>
                    {new Date(data.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                ) : null}
              </View>

              <View style={styles.scoreRingContainer}>
                <View
                  style={[
                    styles.scoreRing,
                    { borderColor: getScoreColor(data.score) },
                  ]}
                >
                  <Text style={[styles.scoreNumber, { color: getScoreColor(data.score) }]}>
                    {data.score}
                  </Text>
                  <Text style={styles.scoreMax}>/ 100</Text>
                </View>
              </View>

              <Text style={styles.levelTitle}>{data.level}</Text>
              <Text style={styles.levelSub}>Overall Performance Rank</Text>
            </View>

            {/* Key Strengths */}
            {data.strengths.length > 0 && (
              <View style={[styles.sectionCard, { borderColor: "#DCFCE7" }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: "#DCFCE7" }]}>
                    <MaterialCommunityIcons name="thumb-up-outline" size={20} color="#16A34A" />
                  </View>
                  <Text style={styles.sectionTitle}>Key Strengths</Text>
                </View>

                {data.strengths.map((item, index) => (
                  <View key={index} style={styles.listItem}>
                    <MaterialCommunityIcons name="check-circle" size={18} color="#16A34A" style={styles.itemIcon} />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Areas for Improvement */}
            {data.weaknesses.length > 0 && (
              <View style={[styles.sectionCard, { borderColor: "#FEE2E2" }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: "#FEE2E2" }]}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#DC2626" />
                  </View>
                  <Text style={styles.sectionTitle}>Areas to Improve</Text>
                </View>

                {data.weaknesses.map((item, index) => (
                  <View key={index} style={styles.listItem}>
                    <MaterialCommunityIcons name="minus-circle" size={18} color="#DC2626" style={styles.itemIcon} />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Suggestions */}
            {data.suggestions.length > 0 && (
              <View style={[styles.sectionCard, { borderColor: "#FEF3C7" }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: "#FEF3C7" }]}>
                    <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={styles.sectionTitle}>Actionable Suggestions</Text>
                </View>

                {data.suggestions.map((item, index) => (
                  <View key={index} style={styles.listItem}>
                    <MaterialCommunityIcons name="arrow-right-circle" size={18} color="#D97706" style={styles.itemIcon} />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Home Action Button */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace("/home")}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="home-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Back to Home Dashboard</Text>
            </TouchableOpacity>
          </>
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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  /* Empty State */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: 28,
  },
  /* Score Header Card */
  scoreHeaderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  positionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  positionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  dateText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  scoreRingContainer: {
    marginBottom: 16,
  },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  scoreNumber: {
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 42,
  },
  scoreMax: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  levelTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  levelSub: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  /* Section Card */
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  /* Primary Button */
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    height: 52,
    borderRadius: 16,
    marginTop: 12,
    elevation: 2,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});