/**
 * ============================================================================
 * หน้าจอ: จัดการใบสมัครและผู้สมัคร (Candidate Management Screen)
 * ============================================================================
 * ไฟล์: src/app/candidate-management.tsx
 *
 * รายละเอียด:
 * - แสดงรายการใบสมัครทั้งหมดแบบละเอียดในรูปแบบ List ให้ HR ค้นหาและกรองสถานะ
 * - แสดงคะแนนคู่: ทั้งคะแนน CV และคะแนนการสัมภาษณ์ AI พร้อมป้ายระดับผลงาน
 * - มีช่องค้นหาตามตำแหน่งงาน (Position Search) แบบ Real-time Client-side
 * - มีแถบปุ่มตัวกรองสถานะ (Filter Chips: ทั้งหมด, ใหม่, กำลังตรวจ, นัดสัมภาษณ์, ผ่าน, ไม่ผ่าน)
 * - กดที่การ์ดเพื่อเข้าไปดูรายงานผลการประเมินฉบับสมบูรณ์ที่ `/candidate-detail`
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

/**
 * โครงสร้างข้อมูลใบสมัครและผลการประเมินของผู้สมัคร
 */
type Candidate = {
  id: number;                          // รหัสรายการ CV
  user_id: string;                     // รหัสผู้ใช้
  position: string | null;            // ตำแหน่งงาน
  score: number | null;               // คะแนน CV
  is_passed: boolean | null;          // สถานะผ่านเกณฑ์เบื้องต้น
  status: string | null;              // สถานะการคัดเลือก (new, reviewing, interview, passed, rejected)
  created_at: string;                 // วันที่ส่ง
  file_url?: string | null;           // URL ลิงก์ไฟล์ PDF ของ CV บน Supabase Storage
  interview_score?: number | null;    // คะแนนสัมภาษณ์ AI
  interview_level?: string | null;    // ระดับผลสัมภาษณ์
  has_interviewed?: boolean;          // มีประวัติสัมภาษณ์หรือไม่
};

/**
 * รายการสถานะและข้อความภาษาไทย
 */
const statuses = ["new", "reviewing", "interview", "passed", "rejected"] as const;
const statusText: Record<string, string> = { new: "New", reviewing: "Under Review", interview: "Interview", passed: "Passed", rejected: "Rejected" };

/**
 * คอมโพเนนต์หลักของหน้าจัดการใบสมัครและผู้สมัคร
 */
export default function CandidateManagement() {
  const router = useRouter();
  const [data, setData] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  /**
   * ดึงข้อมูลใบสมัครทั้งหมดและประวัติการสัมภาษณ์ AI ที่เกี่ยวข้อง
   * นำผลมารวมกัน (merge) เพื่อแสดงคะแนนทั้ง 2 ด้าน
   */
  const loadCandidates = useCallback(async () => {
    setLoading(true);
    const cvPromise = supabase
      .from("cv_history")
      .select("id, user_id, position, score, is_passed, status, created_at, file_url")
      .order("created_at", { ascending: false });

    // ดึงสัมภาษณ์ผ่าน Backend API เพื่อไม่ให้ติด Row-Level Security ของ Supabase
    const interviewPromise = fetch("http://localhost:3000/cv/interviews")
      .then((res) => res.json())
      .then((json) => (json.success && Array.isArray(json.data) ? { data: json.data } : { data: [] }))
      .catch(() =>
        supabase
          .from("interview_history")
          .select("id, cv_id, user_id, position, score, level, created_at")
          .order("created_at", { ascending: false })
      );

    const [cvResult, interviewResult] = await Promise.all([cvPromise, interviewPromise]);

    const cvs = (cvResult.data as any[]) || [];
    const interviews = (interviewResult.data as any[]) || [];

    const merged = cvs.map((cv) => {
      const matched = interviews.find((i) =>
        (i.cv_id && String(i.cv_id) === String(cv.id)) ||
        (i.user_id === cv.user_id && i.position === cv.position) ||
        (!i.cv_id && i.user_id === cv.user_id)
      );

      return {
        ...cv,
        interview_score: matched ? matched.score : null,
        interview_level: matched ? matched.level : null,
        has_interviewed: !!matched,
      };
    });

    setData(merged);
    setLoading(false);
  }, []);

  // โหลดรายการใหม่ทุกครั้งที่กลับมายังหน้านี้
  useFocusEffect(useCallback(() => { void loadCandidates(); }, [loadCandidates]));

  // ค้นหาและกรองในเครื่อง เพื่อไม่ต้องเรียกฐานข้อมูลทุกครั้งที่พิมพ์
  const candidates = useMemo(() => data.filter((item) => {
    const matchesStatus = filter === "all" || (item.status || "new") === filter;
    const matchesSearch = (item.position || "").toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesSearch;
  }), [data, filter, query]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>TONYOURTIRES • HR SYSTEM</Text>
          <Text style={styles.title}>Application Management</Text>
        </View>
      </View>

      {/* ค้นหาผู้สมัครจากตำแหน่งงาน */}
      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={21} color="#64748B" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search by position..." placeholderTextColor="#94A3B8" style={styles.input} />
      </View>

      <FlatList
        data={candidates}
        keyExtractor={(item) => String(item.id)}
        refreshing={loading}
        onRefresh={loadCandidates}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<View style={styles.filters}>
          <Filter label="All" active={filter === "all"} onPress={() => setFilter("all")} />
          {statuses.map((status) => <Filter key={status} label={statusText[status]} active={filter === status} onPress={() => setFilter(status)} />)}
        </View>}
        renderItem={({ item }) => <CandidateCard item={item} onPress={() => router.push({ pathname: "/candidate-detail" as any, params: { id: String(item.id) } })} />}
        ListEmptyComponent={loading ? <ActivityIndicator color="#DC2626" style={styles.loading} /> : <Text style={styles.empty}>No candidates found</Text>}
      />
    </SafeAreaView>
  );
}

/**
 * คอมโพเนนต์ปุ่มตัวกรองสถานะ (Filter Chip)
 */
function Filter({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.filter, active && styles.filterActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></TouchableOpacity>;
}

/**
 * คอมโพเนนต์การ์ดสรุปข้อมูลผู้สมัคร แสดงทั้งคะแนน CV และคะแนนสัมภาษณ์ AI
 */
function CandidateCard({ item, onPress }: { item: Candidate; onPress: () => void }) {
  const status = item.status || "new";
  const isPassed = status === "passed";
  const isRejected = status === "rejected";
  const statusColor = isPassed ? "#15803D" : isRejected ? "#B91C1C" : "#A16207";
  const statusBackground = isPassed ? "#DCFCE7" : isRejected ? "#FEE2E2" : "#FEF3C7";

  const isCvPassed = item.is_passed !== false && Number(item.score ?? 0) >= 50;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={[styles.fileIcon, !isCvPassed && { backgroundColor: "#FEE2E2" }]}>
          <MaterialCommunityIcons
            name={!isCvPassed ? "file-remove-outline" : "file-account-outline"}
            size={24}
            color={!isCvPassed ? "#DC2626" : "#2563EB"}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.position}>{item.position || "General candidate"}</Text>
          <View style={styles.dateRow}>
            <Text style={styles.date}>Submitted on {new Date(item.created_at).toLocaleDateString("en-US")}</Text>
            {item.file_url ? (
              <View style={styles.pdfBadge}>
                <MaterialCommunityIcons name="file-pdf-box" size={13} color="#DC2626" />
                <Text style={styles.pdfBadgeText}>PDF Attached</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: statusBackground }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusText[status]}</Text>
        </View>
      </View>

      {/* แถบแสดงคะแนนคู่กัน (CV & สัมภาษณ์) */}
      <View style={styles.scoreSection}>
        {/* คะแนน CV */}
        <View style={styles.scoreBox}>
          <Text style={styles.scoreBoxLabel}>CV Score</Text>
          <Text style={[styles.scoreBoxValue, { color: isCvPassed ? "#059669" : "#DC2626" }]}>
            {item.score ?? 0}
            <Text style={styles.scoreUnit}>/100</Text>
          </Text>
        </View>

        <View style={styles.scoreDivider} />

        {/* คะแนนสัมภาษณ์ หรือ ป้ายแจ้งว่าไม่ได้เข้าสัมภาษณ์ */}
        <View style={styles.scoreBox}>
          <Text style={styles.scoreBoxLabel}>AI Interview Score</Text>
          {!isCvPassed ? (
            <View style={styles.rejectedPill}>
              <MaterialCommunityIcons name="close-circle" size={13} color="#DC2626" />
              <Text style={styles.rejectedPillText}>CV Screen Failed (No Interview)</Text>
            </View>
          ) : item.has_interviewed ? (
            <View style={styles.interviewScoreRow}>
              <Text style={[styles.scoreBoxValue, { color: Number(item.interview_score ?? 0) >= 50 ? "#2563EB" : "#DC2626" }]}>
                {item.interview_score ?? 0}
                <Text style={styles.scoreUnit}>/100</Text>
              </Text>
              {item.interview_level ? (
                <View style={styles.levelTag}>
                  <Text style={styles.levelTagText}>{item.interview_level}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.waitingInterviewText}>Pending Interview</Text>
          )}
        </View>

        <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { backgroundColor: "#111827", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, flexDirection: "row", alignItems: "center" },
  back: { backgroundColor: "#374151", width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 13 },
  eyebrow: { color: "#FCA5A5", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#FFFFFF", fontSize: 21, fontWeight: "800", marginTop: 3 },
  placeholder: { flex: 1 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", margin: 16, paddingHorizontal: 13, height: 49, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  input: { flex: 1, color: "#0F172A", fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  filter: { borderRadius: 12, backgroundColor: "#E2E8F0", paddingHorizontal: 11, paddingVertical: 8 },
  filterActive: { backgroundColor: "#DC2626" },
  filterText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: "#FFFFFF" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#E2E8F0", padding: 15, marginBottom: 10 },
  cardTop: { flexDirection: "row", alignItems: "center" },
  fileIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", marginRight: 11 },
  copy: { flex: 1 },
  position: { color: "#0F172A", fontWeight: "800", fontSize: 15 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  date: { color: "#94A3B8", fontSize: 11 },
  pdfBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  pdfBadgeText: { color: "#DC2626", fontSize: 10, fontWeight: "700" },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  badge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 9 },
  badgeText: { fontWeight: "800", fontSize: 11 },
  score: { color: "#059669", fontWeight: "800", fontSize: 16 },
  scoreUnit: { color: "#94A3B8", fontSize: 11 },
  scoreSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
  },
  scoreBox: {
    flex: 1,
  },
  scoreBoxLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 3,
  },
  scoreBoxValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  scoreDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
  },
  rejectedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  rejectedPillText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
  },
  interviewScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  levelTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelTagText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
  },
  waitingInterviewText: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  empty: { textAlign: "center", color: "#64748B", marginTop: 35 },
  loading: { marginTop: 35 },
});
