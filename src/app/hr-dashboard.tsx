/**
 * ============================================================================
 * หน้าจอ: แดชบอร์ดสำหรับ HR (HR Portal Dashboard Screen)
 * ============================================================================
 * ไฟล์: src/app/hr-dashboard.tsx
 *
 * รายละเอียด:
 * - หน้าจอหลักสำหรับฝ่ายทรัพยากรบุคคล (HR) ในการบริหารจัดการผู้สมัครงานทั้งหมด
 * - แสดงสถิติภาพรวม: จำนวนผู้สมัคร, ผ่านเกณฑ์ AI, นัดสัมภาษณ์แล้ว, และสัมภาษณ์เสร็จสิ้น
 * - แสดงรายชื่อผู้สมัครพร้อมสถานะการสมัคร คะแนนประเมิน CV และคะแนนสัมภาษณ์ AI
 * - รองรับการค้นหา (Search) และกรองตามสถานะ (Filter chips: ทั้งหมด, ใหม่, กำลังตรวจ, นัดสัมภาษณ์, ผ่าน, ไม่ผ่าน)
 * - มี Modal สำหรับปรับเปลี่ยนสถานะการคัดเลือกของผู้สมัครแต่ละคนได้อย่างรวดเร็ว
 * - ออกแบบ Responsive รองรับทั้งหน้าจอมือถือ (Mobile) และหน้าจอคอมพิวเตอร์ (Desktop พร้อม Sidebar)
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

/**
 * โครงสร้างข้อมูลสรุปของผู้สมัครงานสำหรับแสดงในแดชบอร์ด
 */
type CandidateUser = {
  user_id: string;                      // รหัสผู้ใช้
  email: string | null;                 // อีเมล
  full_name: string | null;             // ชื่อ-นามสกุล
  display_name: string;                 // ชื่อที่ใช้แสดงผล
  cv_count: number;                     // จำนวน CV ที่เคยส่ง
  interview_count: number;              // จำนวนครั้งที่เคยสัมภาษณ์ AI
  latest_status: string;                // สถานะล่าสุด
  latest_cv_id?: string | number;       // รหัส CV ล่าสุด
  latest_cv_score: number | null;       // คะแนน CV ล่าสุด
  latest_interview_score: number | null;// คะแนนสัมภาษณ์ล่าสุด
  latest_position: string | null;       // ตำแหน่งงานล่าสุด
  latest_created_at: string | null;     // วันเวลาที่ส่งล่าสุด
  latest_file_url?: string | null;      // URL of the uploaded CV file
};

/**
 * รายการสถานะการคัดเลือกทั้งหมด
 */
const statuses = ["new", "reviewing", "interview", "passed", "rejected"] as const;
type StatusKey = typeof statuses[number];

/**
 * ข้อความภาษาไทยสำหรับแต่ละสถานะ
 */
const statusText: Record<StatusKey, string> = {
  new: "New",
  reviewing: "Under Review",
  interview: "Interview",
  passed: "Passed",
  rejected: "Rejected",
};

/**
 * คำอธิบายรายละเอียดสำหรับแต่ละสถานะ
 */
const statusDescriptions: Record<StatusKey, string> = {
  new: "Application received, pending review",
  reviewing: "HR is reviewing qualifications",
  interview: "Shortlisted for interview",
  passed: "Candidate selected",
  rejected: "Application unsuccessful",
};

/**
 * คืนค่ารหัสสีตัวอักษรตามสถานะ
 *
 * @param status คีย์สถานะ
 * @returns รหัสสี HEX
 */
function getStatusColor(status: string | null): string {
  switch (status) {
    case "passed": return "#15803D";
    case "rejected": return "#B91C1C";
    case "interview": return "#7C3AED";
    case "reviewing": return "#D97706";
    default: return "#2563EB";
  }
}

/**
 * คืนค่ารหัสสีพื้นหลัง Badge ตามสถานะ
 *
 * @param status คีย์สถานะ
 * @returns รหัสสี HEX
 */
function getStatusBackground(status: string | null): string {
  switch (status) {
    case "passed": return "#DCFCE7";
    case "rejected": return "#FEE2E2";
    case "interview": return "#F3E8FF";
    case "reviewing": return "#FEF3C7";
    default: return "#DBEAFE";
  }
}

/**
 * คอมโพเนนต์หลักของหน้า HR Dashboard
 */
export default function HrDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768; // เช็คว่าเป็นจอมือถือหรือไม่

  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("candidates");

  const [activeModalCandidate, setActiveModalCandidate] = useState<CandidateUser | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  /**
   * ดึงข้อมูลผู้สมัครทั้งหมดสำหรับแดชบอร์ด
   * ลำดับแรก: เรียก GET /cv/users จากเซิร์ฟเวอร์ Backend
   * หาก Backend ไม่ตอบสนอง: ดึงข้อมูลและรวมกลุ่มจากตาราง cv_history, interview_history, profiles ใน Supabase โดยตรง
   */
  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/cv/users");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCandidates(json.data as CandidateUser[]);
        setLoading(false);
        return;
      }
    } catch {
      // Backend unavailable, fallback to Supabase
    }

    try {
      const [cvRes, intvRes, profRes] = await Promise.all([
        supabase
          .from("cv_history")
          .select("id, user_id, position, score, status, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("interview_history")
          .select("user_id, position, score, level, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, email, full_name"),
      ]);

      const cvs = cvRes.data || [];
      const interviews = intvRes.data || [];
      const profiles = profRes.data || [];

      const userMap: Record<string, any> = {};

      for (const cv of cvs) {
        const uid = cv.user_id;
        if (!userMap[uid]) {
          const prof = (profiles.find((p: any) => p.id === uid) as any) || {};
          userMap[uid] = {
            user_id: uid,
            email: prof.email || null,
            full_name: prof.full_name || null,
            cvs: [],
          };
        }
        userMap[uid].cvs.push(cv);
      }

      for (const intv of interviews) {
        const uid = intv.user_id;
        if (uid && !userMap[uid]) {
          const prof = (profiles.find((p: any) => p.id === uid) as any) || {};
          userMap[uid] = {
            user_id: uid,
            email: prof.email || null,
            full_name: prof.full_name || null,
            cvs: [],
          };
        }
      }

      const grouped: CandidateUser[] = Object.values(userMap).map((u: any) => {
        const latestCv = u.cvs[0] || null;
        const userIntvs = interviews.filter((i: { user_id: string | null }) => i.user_id === u.user_id);
        const latestIntv = userIntvs[0] || null;

        const displayName =
          u.full_name ||
          u.email ||
          `Candidate #${u.user_id.slice(0, 6)}`;

        return {
          user_id: u.user_id,
          email: u.email,
          full_name: u.full_name,
          display_name: displayName,
          cv_count: u.cvs.length,
          interview_count: userIntvs.length,
          latest_status: latestCv ? (latestCv.status || "new") : "new",
          latest_cv_id: latestCv ? latestCv.id : undefined,
          latest_cv_score: latestCv ? latestCv.score : null,
          latest_interview_score: latestIntv ? latestIntv.score : null,
          latest_position: latestCv ? latestCv.position : (latestIntv ? latestIntv.position : null),
          latest_created_at: latestCv ? latestCv.created_at : (latestIntv ? latestIntv.created_at : null),
        };
      });

      setCandidates(grouped);
    } catch (e) {
      console.error("Dashboard error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  /**
   * อัปเดตสถานะการคัดเลือกของผู้สมัคร (เช่น 'passed', 'rejected', 'interview')
   * ยิง PATCH /cv/status ไปที่ Backend หรือ fallback อัปเดตตาราง cv_history โดยตรง
   *
   * @param candidate ผู้สมัครที่ต้องการปรับสถานะ
   * @param newStatus สถานะใหม่
   */
  const handleUpdateStatus = async (candidate: CandidateUser, newStatus: StatusKey) => {
    setUpdatingUserId(candidate.user_id);

    try {
      let cvId = candidate.latest_cv_id;
      if (!cvId) {
        const { data: latestCv } = await supabase
          .from("cv_history")
          .select("id")
          .eq("user_id", candidate.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        cvId = latestCv?.id;
      }

      if (cvId) {
        const res = await fetch("http://localhost:3000/cv/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cv_id: cvId, status: newStatus }),
        });
        const json = await res.json();

        if (json.success) {
          setCandidates((prev) =>
            prev.map((c) =>
              c.user_id === candidate.user_id ? { ...c, latest_status: newStatus } : c
            )
          );
          setActiveModalCandidate(null);
          Alert.alert("Success", `Status updated to "${statusText[newStatus]}".`);
          setUpdatingUserId(null);
          return;
        }
      }
    } catch {
      // Backend fallback
    }

    try {
      const { data: latestCv } = await supabase
        .from("cv_history")
        .select("id")
        .eq("user_id", candidate.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestCv) {
        const { error } = await supabase
          .from("cv_history")
          .update({ status: newStatus })
          .eq("id", latestCv.id);

        if (error) throw error;

        // ส่งการแจ้งเตือนไปยังผู้สมัครในกรณี fallback
        try {
          const pos = candidate.latest_position || "Applied Role";
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
            title: notifTitles[newStatus] || "📢 Application Status Update",
            message: notifMsgs[newStatus] || `Your application for "${pos}" has been updated to "${statusText[newStatus] || newStatus}".`,
            type: "status_update",
            related_cv_id: String(latestCv.id),
            is_read: false,
          };

          const { error: notifErr } = await supabase.from("notifications").insert([payload]);
          if (notifErr) {
            await supabase.from("notifications").insert([{ ...payload, related_cv_id: null }]);
          }
        } catch (err) {
          console.warn("[HR Dashboard Notif Catch]", err);
        }
      }

      setCandidates((prev) =>
        prev.map((c) =>
          c.user_id === candidate.user_id ? { ...c, latest_status: newStatus } : c
        )
      );
      setActiveModalCandidate(null);
      Alert.alert("Success", `Status updated to "${statusText[newStatus]}".`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Unable to update status");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      !searchQuery.trim() ||
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.latest_position && c.latest_position.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      statusFilter === "all" || (c.latest_status || "new") === statusFilter;

    return matchesSearch && matchesFilter;
  });

  const totalCvs = candidates.reduce((sum, c) => sum + c.cv_count, 0);
  const passedAiCount = candidates.filter((c) => (c.latest_cv_score ?? 0) >= 50).length;
  const interviewingCount = candidates.filter((c) => c.latest_status === "interview").length;
  const inProgressInterviewCount = candidates.filter(
    (c) => c.interview_count > 0 || c.latest_status === "interview"
  ).length;

  const handleNavPress = (key: string) => {
    setActiveNav(key);
    if (key === "manage") {
      router.push("/candidate-management" as any);
    } else if (key === "settings") {
      router.push("/settings" as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainLayout}>
        {/* ===================== SIDEBAR (แสดงเฉพาะจอใหญ่/Desktop) ===================== */}
        {!isMobile && (
          <View style={styles.sidebar}>
            <View style={styles.logoSection}>
              <View style={styles.brandRow}>
                <View style={styles.tireIconCircle}>
                  <MaterialCommunityIcons name="tire" size={26} color="#DC2626" />
                </View>
                <View style={styles.brandTextGroup}>
                  <Text style={styles.brandTitle}>
                    <Text style={styles.brandTon}>Ton</Text>
                    <Text style={styles.brandYourTires}>YourTires</Text>
                  </Text>
                  <Text style={styles.brandSlogan}>Drive Confident. We've Got You Covered.</Text>
                </View>
              </View>
            </View>

            <View style={styles.navGroup}>
              <TouchableOpacity
                style={[styles.navItem, activeNav === "candidates" && styles.navItemActive]}
                onPress={() => handleNavPress("candidates")}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={20}
                  color={activeNav === "candidates" ? "#FFFFFF" : "#94A3B8"}
                />
                <Text style={[styles.navText, activeNav === "candidates" && styles.navTextActive]}>
                  All Candidates
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeNav === "manage" && styles.navItemActive]}
                onPress={() => handleNavPress("manage")}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="clipboard-list-outline"
                  size={20}
                  color={activeNav === "manage" ? "#FFFFFF" : "#94A3B8"}
                />
                <Text style={[styles.navText, activeNav === "manage" && styles.navTextActive]}>
                  Application Management
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeNav === "settings" && styles.navItemActive]}
                onPress={() => handleNavPress("settings")}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="cog-outline"
                  size={20}
                  color={activeNav === "settings" ? "#FFFFFF" : "#94A3B8"}
                />
                <Text style={[styles.navText, activeNav === "settings" && styles.navTextActive]}>
                  System Settings
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sidebarBottomSection}>
              <View style={styles.sidebarQuoteCard}>
                <Text style={styles.sidebarQuoteTitle}>
                  TonYourTires <Text style={{ color: "#EF4444", fontWeight: "900" }}>HR Portal</Text>
                </Text>
                <Text style={styles.sidebarQuoteSub}>
                  Candidate screening & management system for HR team
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sidebarUserCard}
                onPress={() => router.push("/profile")}
                activeOpacity={0.8}
              >
                <View style={styles.userAvatar}>
                  <MaterialCommunityIcons name="account-tie" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>HR Team</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    hr@tonyourtires.com
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ===================== MAIN CONTENT AREA ===================== */}
        <View style={styles.contentArea}>
          {/* Top Navbar */}
          <View style={styles.topNavbar}>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={19} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search candidates, email..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.topRightGroup}>
              <TouchableOpacity
                style={styles.topProfileBtn}
                onPress={() => router.push("/profile")}
                activeOpacity={0.8}
              >
                <View style={styles.topAvatar}>
                  <MaterialCommunityIcons name="account" size={18} color="#FFFFFF" />
                </View>
                {!isMobile && <Text style={styles.topProfileName}>HR Manager</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#DC2626" />
              <Text style={styles.loadingText}>Loading candidates...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCandidates}
              keyExtractor={(item) => item.user_id}
              refreshing={loading}
              onRefresh={loadDashboard}
              contentContainerStyle={[styles.listContent, isMobile && styles.mobileListContent]}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.headerBlock}>
                  {/* HERO BANNER */}
                  <LinearGradient
                    colors={["#0B0F19", "#1E293B", "#881337", "#991B1B"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroBanner}
                  >
                    <View style={styles.heroTireBg}>
                      <MaterialCommunityIcons name="tire" size={120} color="rgba(255,255,255,0.06)" />
                    </View>

                    <View style={styles.heroContent}>
                      <Text style={styles.heroWelcome}>Welcome to</Text>
                      <Text style={styles.heroTitle}>TonYourTires HR System</Text>
                      <Text style={styles.heroDesc}>
                        Candidate Management & Screening System
                      </Text>
                    </View>
                  </LinearGradient>

                  {/* STAT CARDS (Responsive Grid) */}
                  <View style={styles.statsRow}>
                    <View style={[styles.statCard, isMobile && styles.mobileStatCard]}>
                      <View style={styles.statCardHeader}>
                        <View style={[styles.statIconCircle, { backgroundColor: "#FEE2E2" }]}>
                          <MaterialCommunityIcons name="account-group" size={18} color="#DC2626" />
                        </View>
                      </View>
                      <Text style={styles.statTitle}>Total Candidates</Text>
                      <Text style={styles.statNumber}>{candidates.length}</Text>
                      <Text style={styles.statGrowthText}>Total {totalCvs} applications</Text>
                    </View>

                    <View style={[styles.statCard, isMobile && styles.mobileStatCard]}>
                      <View style={styles.statCardHeader}>
                        <View style={[styles.statIconCircle, { backgroundColor: "#F3E8FF" }]}>
                          <MaterialCommunityIcons name="brain" size={18} color="#9333EA" />
                        </View>
                      </View>
                      <Text style={styles.statTitle}>Passed AI Screening</Text>
                      <Text style={styles.statNumber}>{passedAiCount}</Text>
                      <Text style={styles.statSubInfo}>CV Score ≥ 50%</Text>
                    </View>

                    <View style={[styles.statCard, isMobile && styles.mobileStatCard]}>
                      <View style={styles.statCardHeader}>
                        <View style={[styles.statIconCircle, { backgroundColor: "#DBEAFE" }]}>
                          <MaterialCommunityIcons name="calendar-clock" size={18} color="#2563EB" />
                        </View>
                      </View>
                      <Text style={styles.statTitle}>Interview Scheduled</Text>
                      <Text style={styles.statNumber}>{interviewingCount}</Text>
                      <Text style={styles.statSubInfo}>Status: Interview</Text>
                    </View>

                    <View style={[styles.statCard, isMobile && styles.mobileStatCard]}>
                      <View style={styles.statCardHeader}>
                        <View style={[styles.statIconCircle, { backgroundColor: "#DCFCE7" }]}>
                          <MaterialCommunityIcons name="check-decagram" size={18} color="#16A34A" />
                        </View>
                      </View>
                      <Text style={styles.statTitle}>Interview Completed</Text>
                      <Text style={styles.statNumber}>{inProgressInterviewCount}</Text>
                      <Text style={styles.statSubInfo}>AI Interview Score Available</Text>
                    </View>
                  </View>

                  {/* SECTION HEADER & FILTER CHIPS */}
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleLeft}>
                      <View style={styles.sectionRedBar} />
                      <Text style={styles.sectionHeaderTitle}>
                        Candidates ({filteredCandidates.length})
                      </Text>
                    </View>

                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={["all", ...statuses]}
                      keyExtractor={(s) => s}
                      contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
                      renderItem={({ item: s }) => (
                        <TouchableOpacity
                          style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                          onPress={() => setStatusFilter(s)}
                        >
                          <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                            {s === "all" ? "All" : statusText[s as StatusKey]}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </View>
              }
              renderItem={({ item }) => {
                const currentStatus = (item.latest_status || "new") as StatusKey;
                const letter = (item.display_name.replace("Candidate", "").replace("ผู้สมัคร", "").trim() || "C")
                  .charAt(0)
                  .toUpperCase();

                return (
                  <View style={styles.candidateCard}>
                    <TouchableOpacity
                      style={[styles.cardMainClickable, isMobile && styles.mobileCardMain]}
                      activeOpacity={0.7}
                      onPress={() =>
                        router.push({
                          pathname: "/candidate-profile" as any,
                          params: { user_id: item.user_id },
                        })
                      }
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{letter}</Text>
                        </View>

                        <View style={styles.infoCol}>
                          <Text style={styles.candidateName} numberOfLines={1}>
                            {item.display_name}
                          </Text>
                          {item.email && item.display_name !== item.email && (
                            <Text style={styles.candidateEmail} numberOfLines={1}>
                              {item.email}
                            </Text>
                          )}
                          <View style={styles.metaRow}>
                            <Text style={styles.metaCvCount}>{item.cv_count} CV</Text>
                            {item.interview_count > 0 && (
                              <>
                                <Text style={styles.metaDot}>•</Text>
                                <Text style={styles.metaInterviewCount}>
                                  {item.interview_count} Interview(s)
                                </Text>
                              </>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* แสดงคะแนนและสถานะ */}
                      <View style={[styles.rightStatusCol, isMobile && styles.mobileRightStatusCol]}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusBackground(currentStatus) },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: getStatusColor(currentStatus) },
                            ]}
                          >
                            {statusText[currentStatus] || currentStatus}
                          </Text>
                        </View>

                        <View style={styles.scoresRowGroup}>
                          {item.latest_cv_score != null && (
                            <Text style={styles.scoreTextInline}>
                              CV:{" "}
                              <Text style={{ color: item.latest_cv_score >= 50 ? "#059669" : "#DC2626", fontWeight: "800" }}>
                                {item.latest_cv_score}
                              </Text>
                            </Text>
                          )}
                          {item.latest_interview_score != null && (
                            <Text style={styles.scoreTextInline}>
                              Interview:{" "}
                              <Text style={{ color: item.latest_interview_score >= 50 ? "#2563EB" : "#DC2626", fontWeight: "800" }}>
                                {item.latest_interview_score}
                              </Text>
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Actions Row */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.changeStatusActionBtn}
                        activeOpacity={0.7}
                        onPress={() => setActiveModalCandidate(item)}
                      >
                        <MaterialCommunityIcons name="swap-horizontal" size={15} color="#1D4ED8" />
                        <Text style={styles.changeStatusActionText}>Status</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.viewDetailActionBtn}
                        activeOpacity={0.7}
                        onPress={() =>
                          router.push({
                            pathname: "/candidate-profile" as any,
                            params: { user_id: item.user_id },
                          })
                        }
                      >
                        <Text style={styles.viewDetailActionText}>Profile</Text>
                        <MaterialCommunityIcons name="chevron-right" size={15} color="#475569" />
                      </TouchableOpacity>
                      {/* Button to view CV */}
                      {item.latest_file_url && (
                        <TouchableOpacity
                          style={styles.viewDetailActionBtn}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (item.latest_file_url) {
                              void Linking.openURL(item.latest_file_url);
                            }
                          }}
                        >
                          <MaterialCommunityIcons name="file-pdf-box" size={15} color="#E11D48" />
                          <Text style={styles.viewDetailActionText}>CV File</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <MaterialCommunityIcons name="account-search-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>No candidates found</Text>
                </View>
              }
            />
          )}
        </View>
      </View>

      {/* MODAL เปลี่ยนสถานะ */}
      <Modal
        visible={activeModalCandidate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModalCandidate(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModalCandidate(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>Update Candidate Status</Text>
            <Text style={styles.modalSubtitle} numberOfLines={1}>
              Candidate: {activeModalCandidate?.display_name || "–"}
            </Text>

            <View style={styles.statusOptionsList}>
              {statuses.map((s) => {
                const isSelected = activeModalCandidate?.latest_status === s;
                const color = getStatusColor(s);
                const bg = getStatusBackground(s);

                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusOptionItem,
                      isSelected && { borderColor: color, backgroundColor: bg },
                    ]}
                    onPress={() => {
                      if (activeModalCandidate) {
                        void handleUpdateStatus(activeModalCandidate, s);
                      }
                    }}
                    disabled={updatingUserId !== null}
                  >
                    <View style={styles.statusOptionLeft}>
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.statusOptionLabel,
                            isSelected && { color: color, fontWeight: "800" },
                          ]}
                        >
                          {statusText[s]}
                        </Text>
                        <Text style={styles.statusOptionDesc}>{statusDescriptions[s]}</Text>
                      </View>
                    </View>

                    {isSelected && (
                      <MaterialCommunityIcons name="check-circle" size={20} color={color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {updatingUserId !== null && (
              <View style={styles.updatingLoader}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.updatingText}>Saving status...</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setActiveModalCandidate(null)}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  mainLayout: { flex: 1, flexDirection: "row" },

  // Sidebar (Desktop)
  sidebar: {
    width: 230,
    backgroundColor: "#0B0F19",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  logoSection: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tireIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(220,38,38,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTextGroup: { flex: 1 },
  brandTitle: { fontSize: 17, fontWeight: "900", letterSpacing: -0.3 },
  brandTon: { color: "#FFFFFF", fontStyle: "italic" },
  brandYourTires: { color: "#EF4444" },
  brandSlogan: { fontSize: 7.5, color: "#94A3B8", marginTop: 2 },
  navGroup: { paddingHorizontal: 12, gap: 6 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  navItemActive: { backgroundColor: "#DC2626" },
  navText: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },
  navTextActive: { color: "#FFFFFF", fontWeight: "700" },
  sidebarBottomSection: { padding: 14 },
  sidebarQuoteCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  sidebarQuoteTitle: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  sidebarQuoteSub: { color: "#64748B", fontSize: 10, marginTop: 4 },
  sidebarUserCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 10,
    borderRadius: 12,
    gap: 10,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: { flex: 1 },
  userName: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  userEmail: { color: "#64748B", fontSize: 10 },

  // Main Area
  contentArea: { flex: 1, backgroundColor: "#F8FAFC" },
  topNavbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
    maxWidth: 480,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#1E293B", padding: 0 },
  topRightGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  topProfileBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  topAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  topProfileName: { color: "#0F172A", fontSize: 13, fontWeight: "700" },

  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  loadingText: { color: "#64748B", marginTop: 12, fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 40 },
  mobileListContent: { padding: 12, paddingBottom: 30 },
  headerBlock: { marginBottom: 12, gap: 12 },

  // Hero Banner
  heroBanner: {
    borderRadius: 16,
    padding: 16,
    position: "relative",
    overflow: "hidden",
  },
  heroTireBg: { position: "absolute", right: 10, top: -10, opacity: 0.8 },
  heroContent: { flex: 1, zIndex: 2 },
  heroWelcome: { color: "#EF4444", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", marginTop: 2 },
  heroDesc: { color: "#CBD5E1", fontSize: 11, marginTop: 4 },

  // Stat Cards (Responsive)
  statsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mobileStatCard: {
    minWidth: "47%", // แสดงแถวละ 2 กล่องบนจอมือถือ
  },
  statCardHeader: { marginBottom: 6 },
  statIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statTitle: { color: "#64748B", fontSize: 11, fontWeight: "600" },
  statNumber: { color: "#0F172A", fontSize: 18, fontWeight: "900", marginVertical: 2 },
  statGrowthText: { fontSize: 10, color: "#64748B" },
  statSubInfo: { fontSize: 10, color: "#64748B" },

  // Section Title & Filters
  sectionHeaderRow: { gap: 8, marginTop: 4 },
  sectionTitleLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionRedBar: { width: 3, height: 16, backgroundColor: "#DC2626", borderRadius: 2 },
  sectionHeaderTitle: { color: "#0F172A", fontSize: 15, fontWeight: "800" },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  filterChipText: { color: "#475569", fontSize: 11, fontWeight: "600" },
  filterChipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  // Candidate Card
  candidateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  cardMainClickable: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    justifyContent: "space-between",
  },
  mobileCardMain: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: { color: "#2563EB", fontWeight: "900", fontSize: 16 },
  infoCol: { flex: 1 },
  candidateName: { color: "#0F172A", fontSize: 14, fontWeight: "700" },
  candidateEmail: { color: "#64748B", fontSize: 11, marginTop: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  metaDot: { color: "#94A3B8", marginHorizontal: 4, fontSize: 10 },
  metaCvCount: { color: "#64748B", fontSize: 11 },
  metaInterviewCount: { color: "#7C3AED", fontSize: 11, fontWeight: "600" },

  rightStatusCol: { alignItems: "flex-end", gap: 6 },
  mobileRightStatusCol: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  scoresRowGroup: { gap: 2 },
  scoreTextInline: { fontSize: 11, color: "#64748B" },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },

  cardActionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  changeStatusActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  changeStatusActionText: { color: "#1D4ED8", fontSize: 11, fontWeight: "700" },
  viewDetailActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewDetailActionText: { color: "#475569", fontSize: 11, fontWeight: "600" },

  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyTitle: { color: "#475569", fontSize: 14, fontWeight: "700", marginTop: 8 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "85%",
  },
  modalIndicator: {
    width: 36,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  modalSubtitle: { color: "#64748B", fontSize: 12, marginTop: 2, marginBottom: 12 },
  statusOptionsList: { gap: 8 },
  statusOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  statusOptionLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusOptionLabel: { color: "#1E293B", fontSize: 13, fontWeight: "700" },
  statusOptionDesc: { color: "#64748B", fontSize: 11, marginTop: 1 },
  updatingLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  updatingText: { color: "#64748B", fontSize: 12 },
  closeModalBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  closeModalBtnText: { color: "#475569", fontSize: 13, fontWeight: "700" },
});