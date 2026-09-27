/**
 * ============================================================================
 * หน้าจอ: เลือกตำแหน่งงาน (Select Position Screen)
 * ============================================================================
 * ไฟล์: src/app/select-position.tsx
 *
 * รายละเอียด:
 * - แสดงรายการหมวดหมู่งานหรือตำแหน่งที่ผู้สมัครสามารถเลือกเพื่อทำการจำลองสัมภาษณ์
 * - รองรับระบบหลายภาษา (i18n) ผ่าน useLanguage hook
 * - มี Animation นุ่มนวลตอนเรนเดอร์การ์ดตำแหน่งงาน (FadeInDown)
 * - เมื่อคลิกเลือกตำแหน่งงาน จะนำทางผู้ใช้ไปยังหน้าอัปโหลดเรซูเม่ (/upload-cv) พร้อมส่งชื่อตำแหน่งไปด้วย
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLanguage } from "../context/language-context";

/**
 * โครงสร้างข้อมูลสำหรับแต่ละตำแหน่งงาน
 */
interface JobItem {
  title: string;                                        // ชื่อตำแหน่งงาน (ดึงตามภาษาที่เลือก)
  subtitle: string;                                     // คำอธิบายโดยย่อของตำแหน่งงาน
  icon: keyof typeof MaterialCommunityIcons.glyphMap;    // ชื่อไอคอนจาก MaterialCommunityIcons
  color: string;                                        // สีหลักของหมวดหมู่ตำแหน่งงาน
}

/**
 * คอมโพเนนต์หลักของหน้าเลือกตำแหน่งงาน
 */
export default function SelectPosition() {
  const router = useRouter();
  const { t } = useLanguage();

  // รายการตำแหน่งงานทั้งหมดที่มีให้เลือกในระบบ
  const jobs: JobItem[] = [
    {
      title: t.selectPosition.jobs.frontend.title,
      subtitle: t.selectPosition.jobs.frontend.subtitle,
      icon: "laptop",
      color: "#2563EB",
    },
    {
      title: t.selectPosition.jobs.backend.title,
      subtitle: t.selectPosition.jobs.backend.subtitle,
      icon: "server-network",
      color: "#0891B2",
    },
    {
      title: t.selectPosition.jobs.fullstack.title,
      subtitle: t.selectPosition.jobs.fullstack.subtitle,
      icon: "layers-triple-outline",
      color: "#7C3AED",
    },
    {
      title: t.selectPosition.jobs.mobile.title,
      subtitle: t.selectPosition.jobs.mobile.subtitle,
      icon: "cellphone-cog",
      color: "#D97706",
    },
    {
      title: t.selectPosition.jobs.data.title,
      subtitle: t.selectPosition.jobs.data.subtitle,
      icon: "chart-box-outline",
      color: "#059669",
    },
    {
      title: t.selectPosition.jobs.ux.title,
      subtitle: t.selectPosition.jobs.ux.subtitle,
      icon: "palette-outline",
      color: "#DB2777",
    },
  ];

  /**
   * จัดการการกดเลือกตำแหน่งงาน
   * ส่งชื่อตำแหน่งไปยังหน้า /upload-cv ผ่าน query params
   *
   * @param positionTitle ชื่อตำแหน่งที่ผู้ใช้เลือก
   */
  const handleSelectJob = (positionTitle: string) => {
    router.push({
      pathname: "/upload-cv",
      params: {
        position: positionTitle,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t.selectPosition.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeInDown.duration(450)}>
          <Text style={styles.headerTitle}>{t.selectPosition.targetRole}</Text>
          <Text style={styles.headerSub}>
          {t.selectPosition.description}
          </Text>
        </Animated.View>

        {/* Job Category Cards */}
        {jobs.map((job, index) => (
          <Animated.View
            key={job.title}
            entering={FadeInDown.delay(index * 70 + 100).duration(450)}
          >
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => handleSelectJob(job.title)}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${job.color}15` }]}>
              <MaterialCommunityIcons name={job.icon} size={26} color={job.color} />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobSubtitle}>{job.subtitle}</Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color="#94A3B8"
              style={styles.chevron}
            />
          </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7F9",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#111111",
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2A2A2A",
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    lineHeight: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  jobSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  chevron: {
    marginLeft: 8,
  },
});