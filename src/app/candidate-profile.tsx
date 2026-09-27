/**
 * ============================================================================
 * หน้าจอ: ข้อมูลประวัติผู้สมัครรายบุคคล (Candidate Profile Screen)
 * ============================================================================
 * ไฟล์: src/app/candidate-profile.tsx
 *
 * รายละเอียด:
 * - แสดงประวัติการยื่นใบสมัคร (CV) และผลการสัมภาษณ์ AI ทั้งหมดของผู้สมัครที่ระบุ (user_id)
 * - HR สามารถดูคะแนนเปรียบเทียบทั้งฝั่ง CV และสัมภาษณ์ AI ในแต่ละรอบ
 * - มีระบบปรับสถานะใบสมัคร (Status: ใหม่, กำลังตรวจ, นัดสัมภาษณ์, ผ่าน, ไม่ผ่าน) ผ่าน Modal แบบ Responsive
 * - สามารถกดเข้าไปดูรายละเอียดเชิงลึกของแต่ละใบสมัครได้ที่หน้า `/candidate-detail`
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

/**
 * โครงสร้างข้อมูลใบสมัครงานแต่ละรายการ
 */
type CvItem = {
  id: string | number;                  // รหัสใบสมัคร CV
  position: string | null;             // ตำแหน่งงาน
  score: number | null;                // คะแนนประเมิน CV
  is_passed: boolean | null;           // ผ่านเกณฑ์ CV หรือไม่
  status: string | null;               // สถานะการคัดเลือก
  created_at: string;                  // วันเวลาที่ส่ง
  file_url?: string | null;            // 👈 URL ไฟล์ PDF บน Supabase Storage
  interview_score?: number | null;     // คะแนนการสัมภาษณ์ AI (ถ้ามี)
  interview_level?: string | null;     // ระดับผลการสัมภาษณ์ (ถ้ามี)
};

/**
 * โครงสร้างข้อมูลโปรไฟล์ของผู้สมัคร
 */
type ProfileData = {
  id: string;                          // รหัสผู้ใช้
  email: string | null;                // อีเมล
  full_name: string | null;            // ชื่อ-นามสกุล
  display_name: string;                // ชื่อที่ใช้แสดงผล
};

/**
 * สถานะการคัดเลือกทั้งหมด
 */
const statuses = ["new", "reviewing", "interview", "passed", "rejected"] as const;
type StatusKey = typeof statuses[number];

/**
 * ป้ายข้อความภาษาไทยสำหรับสถานะ
 */
const statusText: Record<StatusKey, string> = {
  new: "New",
  reviewing: "Under Review",
  interview: "Interview",
  passed: "Passed",
  rejected: "Rejected",
};

/**
 * รายละเอียดคำอธิบายสถานะ
 */
const statusDescriptions: Record<StatusKey, string> = {
  new: "Application received, pending review",
  reviewing: "HR team is reviewing qualifications",
  interview: "Shortlisted for interview stage",
  passed: "Candidate successfully selected",
  rejected: "Did not meet selection criteria",
};

/**
 * คืนค่ารหัสสีตัวอักษรตามสถานะ
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
 * คอมโพเนนต์หลักของหน้าประวัติผู้สมัครรายบุคคล
 */
export default function CandidateProfile() {
  const router = useRouter();
  const { user_id } = useLocalSearchParams<{ user_id: string }>();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [cvs, setCvs] = useState<CvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  // Modal เปลี่ยนสถานะ (ทำงานได้ 100% บนทั้ง Web, iOS และ Android)
  const [activeModalCv, setActiveModalCv] = useState<CvItem | null>(null);

  /**
   * ดึงข้อมูลโปรไฟล์ของผู้สมัครและประวัติการส่งใบสมัครทั้งหมด
   * เรียก GET /cv/user/:user_id จาก Backend หรือดึงตรงจาก Supabase หาก Backend ไม่พร้อม
   */
  const loadProfile = useCallback(async () => {
    if (!user_id) return;
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:3000/cv/user/${user_id}`);
      const json = await res.json();

      if (json.success) {
        const interviews: any[] = json.interviews || [];
        const merged: CvItem[] = (json.cvs || []).map((cv: any) => {
          const matched = interviews.find(
            (i) =>
              (i.cv_id && String(i.cv_id) === String(cv.id)) ||
              (!i.cv_id && i.position === cv.position) ||
              (!i.cv_id)
          );
          return {
            ...cv,
            interview_score: matched ? matched.score : null,
            interview_level: matched ? matched.level : null,
          };
        });

        setCvs(merged);
        if (json.profile) {
          setProfile(json.profile);
        }
      } else {
        throw new Error(json.error);
      }
    } catch {
      // Fallback โหลดตรงจาก Supabase ถ้า backend ไม่พร้อม
      const [cvRes, intvRes, profRes] = await Promise.all([
        supabase
          .from("cv_history")
          .select("id, user_id, position, score, is_passed, status, created_at, file_url")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("interview_history")
          .select("id, cv_id, user_id, position, score, level, created_at")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("id", user_id)
          .maybeSingle(),
      ]);

      const cvList = cvRes.data || [];
      const intvList = intvRes.data || [];
      const p = profRes.data;

      const merged = cvList.map((cv: any) => {
        const matched = intvList.find(
          (i: any) =>
            (i.cv_id && String(i.cv_id) === String(cv.id)) ||
            (!i.cv_id && i.position === cv.position) ||
            (!i.cv_id)
        );
        return {
          ...cv,
          interview_score: matched ? matched.score : null,
          interview_level: matched ? matched.level : null,
        };
      });

      setCvs(merged);
      setProfile({
        id: user_id,
        email: p?.email || null,
        full_name: p?.full_name || null,
        display_name: p?.full_name || p?.email || (merged[0] ? `Candidate (${merged[0].position || "General"})` : `Candidate #${user_id.slice(0, 6)}`),
      });
    }

    setLoading(false);
  }, [user_id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  /**
   * ฟังก์ชันอัปเดตสถานะใบสมัครของผู้สมัคร
   * ยิง PATCH /cv/status ไปยัง Backend หรืออัปเดตตรงเข้าตาราง cv_history ใน Supabase
   *
   * @param cvId รหัส CV
   * @param newStatus สถานะใหม่ที่ต้องการตั้งค่า
   */
  const handleUpdateStatus = async (cvId: string | number, newStatus: StatusKey) => {
    setUpdatingId(cvId);
    try {
      // 1. ลองอัปเดตผ่าน backend
      const res = await fetch("http://localhost:3000/cv/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_id: cvId, status: newStatus }),
      });
      const json = await res.json();

      if (json.success) {
        setCvs((prev) =>
          prev.map((item) => (item.id === cvId ? { ...item, status: newStatus } : item))
        );
        setActiveModalCv(null);
        Alert.alert("Success", `Status updated to "${statusText[newStatus]}".`);
        setUpdatingId(null);
        return;
      }
    } catch {
      // Backend error, try direct
    }

    // 2. Fallback: อัปเดตตรงเข้า Supabase
    try {
      const { error } = await supabase
        .from("cv_history")
        .update({ status: newStatus })
        .eq("id", cvId);

      if (error) throw error;

      // สร้างการแจ้งเตือน fallback ไปยังตาราง notifications ของผู้สมัคร
      if (user_id) {
        try {
          const pos = activeModalCv?.position || "Applied Role";
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
            user_id: user_id,
            title: notifTitles[newStatus] || "📢 Application Status Update",
            message: notifMsgs[newStatus] || `Your application for "${pos}" has been updated to "${statusText[newStatus] || newStatus}".`,
            type: "status_update",
            related_cv_id: cvId ? String(cvId) : null,
            is_read: false,
          };
          const { error: notifErr } = await supabase.from("notifications").insert([payload]);
          if (notifErr) {
            // หาก column related_cv_id ยังเป็น bigint ให้ fallback insert โดยส่ง null
            await supabase.from("notifications").insert([{ ...payload, related_cv_id: null }]);
          }
        } catch (err) {
          console.warn("[Notification Fallback Catch]", err);
        }
      }

      setCvs((prev) =>
        prev.map((item) => (item.id === cvId ? { ...item, status: newStatus } : item))
      );
      setActiveModalCv(null);
      Alert.alert("Success", `Status updated to "${statusText[newStatus]}".`);
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Unable to change status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const displayName = profile?.display_name || "Candidate";
  const avatarLetter = (displayName.replace("Candidate", "").replace("ผู้สมัคร", "").trim() || "C").charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.eyebrow}>TONYOURTIRES • HR SYSTEM</Text>
          <Text style={styles.headerTitle}>Candidate Profile</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading candidate data...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{avatarLetter}</Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{displayName}</Text>
              {profile?.email && <Text style={styles.profileEmail}>{profile.email}</Text>}
              <View style={styles.profileMetaBadge}>
                <MaterialCommunityIcons name="file-document-outline" size={13} color="#475569" />
                <Text style={styles.profileMetaText}>{cvs.length} applications</Text>
              </View>
            </View>
          </View>

          {/* CVs and Interviews */}
          <Text style={styles.sectionHeader}>Application & Screening History</Text>

          {cvs.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="folder-open-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No application history found</Text>
            </View>
          ) : (
            cvs.map((cv) => {
              const currentStatus = (cv.status || "new") as StatusKey;
              const isCvPassed = cv.is_passed !== false && (cv.score ?? 0) >= 50;

              return (
                <View key={String(cv.id)} style={styles.cvCard}>
                  {/* Top Bar: Position & Status Badge */}
                  <View style={styles.cvHeader}>
                    <View style={[styles.positionIcon, !isCvPassed && { backgroundColor: "#FEE2E2" }]}>
                      <MaterialCommunityIcons
                        name={isCvPassed ? "briefcase-outline" : "alert-circle-outline"}
                        size={20}
                        color={isCvPassed ? "#2563EB" : "#DC2626"}
                      />
                    </View>
                    <View style={styles.positionInfo}>
                      <Text style={styles.positionTitle}>{cv.position || "General candidate"}</Text>
                      <Text style={styles.submitDate}>
                        Submitted on {new Date(cv.created_at).toLocaleDateString("en-US")}
                      </Text>
                    </View>
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
                  </View>

                  {/* Dual Score Section */}
                  <View style={styles.scoresRow}>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>CV Score</Text>
                      <Text
                        style={[
                          styles.scoreNumber,
                          { color: isCvPassed ? "#059669" : "#DC2626" },
                        ]}
                      >
                        {cv.score ?? 0}
                        <Text style={styles.scoreSub}>/100</Text>
                      </Text>
                    </View>

                    <View style={styles.scoreSeparator} />

                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>AI Interview</Text>
                      {cv.interview_score != null ? (
                        <View style={styles.interviewScoreWrap}>
                          <Text
                            style={[
                              styles.scoreNumber,
                              {
                                color:
                                  Number(cv.interview_score) >= 50 ? "#2563EB" : "#DC2626",
                              },
                            ]}
                          >
                            {cv.interview_score}
                            <Text style={styles.scoreSub}>/100</Text>
                          </Text>
                          {cv.interview_level ? (
                            <View style={styles.levelPill}>
                              <Text style={styles.levelPillText}>{cv.interview_level}</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        <Text style={styles.waitingText}>
                          {!isCvPassed ? "No Interview" : "Pending Interview"}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Action Buttons: ดูไฟล์ CV, Status Change & Full Detail */}
                  <View style={styles.buttonRow}>
                    {/* ปุ่มเปิดดูไฟล์ CV ต้นฉบับ (PDF) ที่อัปโหลดไว้บน Supabase Storage ในรอบนี้ */}
                    {cv.file_url ? (
                      <TouchableOpacity
                        style={styles.viewPdfBtn}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (cv.file_url) {
                            Linking.openURL(cv.file_url).catch((err) =>
                              console.error("Unable to open PDF:", err)
                            );
                          }
                        }}
                      >
                        <MaterialCommunityIcons name="file-pdf-box" size={16} color="#DC2626" />
                        <Text style={styles.viewPdfBtnText}>View CV</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={styles.changeStatusBtn}
                      activeOpacity={0.7}
                      onPress={() => setActiveModalCv(cv)}
                    >
                      <MaterialCommunityIcons name="swap-horizontal" size={16} color="#1D4ED8" />
                      <Text style={styles.changeStatusBtnText}>Change Status</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.viewDetailBtn}
                      activeOpacity={0.7}
                      onPress={() =>
                        router.push({
                          pathname: "/candidate-detail" as any,
                          params: { id: String(cv.id) },
                        })
                      }
                    >
                      <Text style={styles.viewDetailBtnText}>Full Details</Text>
                      <MaterialCommunityIcons name="chevron-right" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Modal ปรับเปลี่ยนสถานะ (Custom Bottom Sheet) */}
      <Modal
        visible={activeModalCv !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModalCv(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModalCv(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalIndicator} />

            <Text style={styles.modalTitle}>Update Candidate Status</Text>
            <Text style={styles.modalSubtitle}>
              Position: {activeModalCv?.position || "General candidate"}
            </Text>

            <View style={styles.statusOptionsList}>
              {statuses.map((s) => {
                const isSelected = activeModalCv?.status === s;
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
                      if (activeModalCv) {
                        void handleUpdateStatus(activeModalCv.id, s);
                      }
                    }}
                    disabled={updatingId !== null}
                  >
                    <View style={styles.statusOptionLeft}>
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                      <View>
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

            {updatingId !== null && (
              <View style={styles.updatingLoader}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.updatingText}>Saving status...</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setActiveModalCv(null)}
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  eyebrow: { color: "#FCA5A5", fontWeight: "800", fontSize: 10, letterSpacing: 1.5 },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginTop: 2 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  loadingText: { color: "#64748B", marginTop: 12, fontSize: 14 },
  content: { padding: 16, paddingBottom: 40 },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    borderWidth: 2,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  profileAvatarText: { color: "#2563EB", fontSize: 24, fontWeight: "900" },
  profileDetails: { flex: 1 },
  profileName: { color: "#0F172A", fontSize: 17, fontWeight: "800" },
  profileEmail: { color: "#64748B", fontSize: 13, marginTop: 2 },
  profileMetaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 6,
    gap: 4,
  },
  profileMetaText: { color: "#475569", fontSize: 11, fontWeight: "600" },

  sectionHeader: { color: "#0F172A", fontSize: 16, fontWeight: "800", marginBottom: 12 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { color: "#94A3B8", marginTop: 8, fontSize: 14 },

  cvCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cvHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  positionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  positionInfo: { flex: 1 },
  positionTitle: { color: "#1E293B", fontWeight: "700", fontSize: 15 },
  submitDate: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },

  scoresRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#FAFAFA",
  },
  scoreItem: { flex: 1 },
  scoreLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "600", marginBottom: 2 },
  scoreNumber: { fontSize: 18, fontWeight: "800" },
  scoreSub: { fontSize: 11, color: "#94A3B8", fontWeight: "400" },
  scoreSeparator: { width: 1, height: 32, backgroundColor: "#E2E8F0", marginHorizontal: 12 },
  interviewScoreWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  levelPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#EDE9FE",
  },
  levelPillText: { color: "#7C3AED", fontSize: 10, fontWeight: "700" },
  waitingText: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  viewPdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  viewPdfBtnText: { color: "#DC2626", fontSize: 13, fontWeight: "700" },
  changeStatusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  changeStatusBtnText: { color: "#1D4ED8", fontSize: 13, fontWeight: "700" },
  viewDetailBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#0F172A",
  },
  viewDetailBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    maxHeight: "85%",
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  modalSubtitle: { color: "#64748B", fontSize: 13, marginTop: 2, marginBottom: 16 },
  statusOptionsList: { gap: 10 },
  statusOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  statusOptionLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionLabel: { color: "#1E293B", fontSize: 15, fontWeight: "700" },
  statusOptionDesc: { color: "#64748B", fontSize: 12, marginTop: 2 },
  updatingLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  updatingText: { color: "#64748B", fontSize: 13 },
  closeModalBtn: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  closeModalBtnText: { color: "#475569", fontSize: 14, fontWeight: "700" },
});