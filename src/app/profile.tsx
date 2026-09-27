/**
 * ============================================================================
 * หน้าจอ: โปรไฟล์ผู้ใช้งานและสถิติ (Profile Screen)
 * ============================================================================
 * ไฟล์: src/app/profile.tsx
 *
 * รายละเอียด:
 * - แสดงข้อมูลบัญชีของผู้ใช้ (อีเมล, บทบาท: Candidate หรือ HR Administrator)
 * - สำหรับ Candidate: คำนวณและแสดงสถิติภาพรวมจากการสัมภาษณ์ (จำนวนครั้งที่ทำ, คะแนนเฉลี่ย, คะแนนสูงสุด, ตำแหน่งที่เน้นมากที่สุด)
 * - สำหรับ HR: แสดงปุ่มทางลัดเพื่อไปยังแดชบอร์ดบริหารจัดการ HR
 * - มีฟังก์ชันออกจากระบบ (Sign Out) ทั้งบนเว็บและแอปมือถือ
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLanguage } from "../context/language-context";
import { supabase } from "../lib/supabase";

/**
 * คอมโพเนนต์หลักของหน้าโปรไฟล์
 */
export default function Profile() {
  const router = useRouter();
  const { t } = useLanguage();
  
  // ข้อมูลโปรไฟล์และบทบาทผู้ใช้
  const [email, setEmail] = useState("");
  const [userRole, setUserRole] = useState<"candidate" | "hr" | "admin">("candidate");
  
  // ข้อมูลสถิติของ Candidate
  const [totalInterview, setTotalInterview] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [highestScore, setHighestScore] = useState(0);
  const [favoritePosition, setFavoritePosition] = useState("");
  
  // สถานะการโหลดและออกจากระบบ
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, []);

  /**
   * โหลดข้อมูลโปรไฟล์ บทบาท และสถิติการสัมภาษณ์จาก Supabase
   */
  const loadProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setEmail(user.email ?? "");

      // ดึงข้อมูล role จากตาราง profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData?.role) {
        setUserRole(profileData.role as "candidate" | "hr" | "admin");
      }

      // ถ้าเป็น HR ให้หยุดตรงนี้ ไม่ต้องดึงสถิติการสัมภาษณ์
      if (profileData?.role === "hr" || profileData?.role === "admin") {
        setLoading(false);
        return;
      }

      // สำหรับ Candidate: ดึงสถิติจากตาราง interview_history
      const { data, error } = await supabase
        .from("interview_history")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Profile history query error:", error);
        return;
      }

      if (!data) return;

      setTotalInterview(data.length);

      if (data.length > 0) {
        const parseScore = (value: unknown) => {
          if (typeof value === "number") return value;
          if (typeof value !== "string") return Number.NaN;

          const match = value.match(/-?\d+(?:\.\d+)?/);
          return match ? Number(match[0]) : Number.NaN;
        };

        const scores = data
          .map((interview) =>
            parseScore(
              interview.score ??
                interview.total_score ??
                interview.evaluation_score
            )
          )
          .filter((score) => Number.isFinite(score) && score >= 0 && score <= 100);

        if (scores.length > 0) {
          const avg =
            scores.reduce((total, score) => total + score, 0) /
            scores.length;

          setAverageScore(avg);
          setHighestScore(Math.max(...scores));
        }

        const count: Record<string, number> = {};

        data.forEach((i) => {
          if (i.position) {
            count[i.position] = (count[i.position] || 0) + 1;
          }
        });

        const favoriteKeys = Object.keys(count);
        if (favoriteKeys.length > 0) {
          const favorite = favoriteKeys.reduce((a, b) =>
            count[a] > count[b] ? a : b
          );
          setFavoritePosition(favorite);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const performLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        Alert.alert(t.auth.error, error.message);
        return;
      }

      router.replace("/login");
    } catch (error) {
      Alert.alert(
        t.auth.error,
        error instanceof Error ? error.message : t.auth.unexpectedError
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      void performLogout();
      return;
    }

    Alert.alert(t.profile.logoutTitle, t.profile.logoutMessage, [
      { text: t.profile.cancel, style: "cancel" },
      {
        text: t.profile.signOut,
        style: "destructive",
        onPress: () => void performLogout(),
      },
    ]);
  };

  const userName = email ? email.split("@")[0] : "User";
  const isHr = userRole === "hr" || userRole === "admin";

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t.profile.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Profile Card Header */}
        <Animated.View entering={FadeInDown.duration(550)} style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatarCircle, isHr && { backgroundColor: "#DC2626" }]}>
              <Text style={styles.avatarInitial}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.onlineBadge} />
          </View>

          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.email}>{email || "user@tonyourtires.com"}</Text>

          {/* Role Badge */}
          <View style={[styles.roleBadge, isHr && { backgroundColor: "#FEE2E2" }]}>
            <MaterialCommunityIcons
              name={isHr ? "shield-account" : "shield-check"}
              size={14}
              color={isHr ? "#DC2626" : "#2563EB"}
            />
            <Text style={[styles.roleBadgeText, isHr && { color: "#DC2626" }]}>
              {isHr ? "HR Administrator" : t.profile.candidateMember}
            </Text>
          </View>
        </Animated.View>

        {/* Content Section: สลับระหว่าง HR Management กับ Performance Stats */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        ) : isHr ? (
          /* HR Specific Menu */
          <Animated.View entering={FadeInDown.delay(180).duration(550)} style={styles.hrSection}>
            <Text style={styles.sectionHeaderTitle}>System Management</Text>
            <TouchableOpacity
              style={styles.hrDashboardBtn}
              onPress={() => router.push("/hr-dashboard")}
              activeOpacity={0.85}
            >
              <View style={styles.hrBtnLeft}>
                <MaterialCommunityIcons name="view-dashboard" size={22} color="#FFFFFF" />
                <Text style={styles.hrBtnText}>Back to HR Dashboard</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          /* Performance Statistics Overview สำหรับ Candidate */
          <View>
            <Text style={styles.sectionHeaderTitle}>{t.profile.performance}</Text>
            <Animated.View entering={FadeInDown.delay(180).duration(550)} style={styles.statsGrid}>
              {/* Stat Item 1: Total Interviews */}
              <View style={styles.statCard}>
                <View style={[styles.iconBg, { backgroundColor: "#EFF6FF" }]}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={22} color="#2563EB" />
                </View>
                <Text style={styles.statNumber}>{totalInterview}</Text>
                <Text style={styles.statTitle}>{t.profile.totalCompleted}</Text>
              </View>

              {/* Stat Item 2: Average Score */}
              <View style={styles.statCard}>
                <View style={[styles.iconBg, { backgroundColor: "#FEF3C7" }]}>
                  <MaterialCommunityIcons name="star-outline" size={22} color="#D97706" />
                </View>
                <Text style={styles.statNumber}>{averageScore.toFixed(1)}</Text>
                <Text style={styles.statTitle}>{t.profile.averageScore}</Text>
              </View>

              {/* Stat Item 3: Highest Score */}
              <View style={styles.statCard}>
                <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                  <MaterialCommunityIcons name="trophy-outline" size={22} color="#16A34A" />
                </View>
                <Text style={styles.statNumber}>{highestScore}</Text>
                <Text style={styles.statTitle}>{t.profile.highestScore}</Text>
              </View>

              {/* Stat Item 4: Favorite Position */}
              <View style={styles.statCard}>
                <View style={[styles.iconBg, { backgroundColor: "#F3E8FF" }]}>
                  <MaterialCommunityIcons name="briefcase-outline" size={22} color="#8B5CF6" />
                </View>
                <Text
                  style={[styles.statNumber, styles.favPositionText]}
                  numberOfLines={1}
                >
                  {favoritePosition || t.profile.notAvailable}
                </Text>
                <Text style={styles.statTitle}>{t.profile.topFocusJob}</Text>
              </View>
            </Animated.View>
          </View>
        )}

        {/* Settings Button */}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/settings")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="cog-outline" size={20} color="#0F172A" />
          <Text style={styles.settingsText}>ตั้งค่าระบบ AI (Cloud / Local LLM)</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Logout Action Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <MaterialCommunityIcons name="logout" size={20} color="#DC2626" />
          )}
          <Text style={styles.logoutText}>
            {loggingOut ? t.profile.signOut : t.profile.logout}
          </Text>
        </TouchableOpacity>
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
    backgroundColor: "#0F172A",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  onlineBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
    textTransform: "capitalize",
  },
  email: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 14,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  
  // HR Section
  hrSection: {
    marginBottom: 24,
  },
  hrDashboardBtn: {
    backgroundColor: "#DC2626",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  hrBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hrBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  // Candidate Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  favPositionText: {
    fontSize: 15,
    lineHeight: 28,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  settingsText: {
    flex: 1,
    marginLeft: 10,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "700",
  },
});