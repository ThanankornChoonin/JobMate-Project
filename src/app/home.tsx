/**
 * ============================================================================
 * JobMate Screen - Candidate Home (src/app/home.tsx)
 * ============================================================================
 * หน้าจอหลักสำหรับผู้สมัครงาน (Candidate Dashboard):
 * 1. แบนเนอร์หลักสไตล์ TonYourTires พร้อมแอนิเมชัน Pulse และ Laser Scan ของ AI Core
 * 2. สลับภาษาไทย/อังกฤษ (TH/EN) ที่มุมขวาบน
 * 3. ปุ่มกระดิ่งแจ้งเตือน (Notification Bell) พร้อมระบบ Realtime เด้งเตือนสด
 *    เมื่อ ADMIN / HR ปรับสถานะใบสมัครของผู้ใช้
 * 4. หน้าต่าง Modal แสดงรายการแจ้งเตือน พร้อมปุ่มทำเครื่องหมายว่าอ่านแล้ว
 * 5. ปุ่ม Action เริ่มต้นคัดกรอง / ยื่นสมัครงานใหม่ (/select-position)
 * 6. การ์ดเมนูทางลัด 4 หมวด:
 *    - เริ่มสมัครงานใหม่ (/select-position)
 *    - ผลการประเมินล่าสุด (/result)
 *    - ประวัติย้อนหลัง (/history)
 *    - จัดการบัญชีโปรไฟล์ (/profile)
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useLanguage } from "../context/language-context";
import { supabase } from "../lib/supabase";

/**
 * โครงสร้างข้อมูลการแจ้งเตือน
 */
type NotificationItem = {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_cv_id?: number | null;
  is_read: boolean;
  created_at: string;
};

/**
 * ฟังก์ชันช่วยแปลงเวลาให้อยู่ในรูปแบบอ่านง่ายภาษาอังกฤษ
 */
function formatNotifTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

/**
 * กำหนดไอคอนและสีสันตามประเภทและหัวข้อการแจ้งเตือน
 */
function getNotifTheme(type: string, title: string) {
  const lowerTitle = (title || "").toLowerCase();
  const lowerType = (type || "").toLowerCase();

  if (lowerTitle.includes("สัมภาษณ์") || lowerTitle.includes("interview") || lowerType.includes("interview")) {
    return {
      icon: "account-voice" as const,
      color: "#2563EB",
      bg: "#EFF6FF",
      border: "#BFDBFE",
    };
  }
  if (lowerTitle.includes("ผ่านการคัดเลือก") || lowerTitle.includes("ยินดีด้วย") || lowerTitle.includes("selected") || lowerTitle.includes("congratulations")) {
    return {
      icon: "check-decagram" as const,
      color: "#16A34A",
      bg: "#F0FDF4",
      border: "#BBF7D0",
    };
  }
  if (lowerTitle.includes("ผลการพิจารณา") || lowerTitle.includes("ระงับ") || lowerTitle.includes("ไม่ผ่าน") || lowerTitle.includes("rejected") || lowerTitle.includes("unsuccessful")) {
    return {
      icon: "close-circle-outline" as const,
      color: "#DC2626",
      bg: "#FEF2F2",
      border: "#FECACA",
    };
  }
  if (lowerTitle.includes("ตรวจสอบ") || lowerTitle.includes("review") || lowerTitle.includes("received")) {
    return {
      icon: "file-search-outline" as const,
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
    };
  }
  return {
    icon: "bell-ring-outline" as const,
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  };
}

/**
 * Home Component
 */
export default function Home() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  // จัดการข้อมูลการแจ้งเตือน
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // คำนวณจำนวนแจ้งเตือนที่ยังไม่ได้อ่าน
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Reanimated Shared Values สำหรับเอฟเฟกต์ AI Halo และ Scanning Line
  const pulse = useSharedValue(1);
  const scanPosition = useSharedValue(-1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1800 }),
        withTiming(1, { duration: 1800 })
      ),
      -1,
      true
    );
    scanPosition.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800 }),
        withTiming(-1, { duration: 0 })
      ),
      -1,
      false
    );
  }, [pulse, scanPosition]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.2 + (pulse.value - 1) * 3,
  }));

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanPosition.value * 75 }],
  }));

  /**
   * ดึงรายการแจ้งเตือนของผู้ใช้จาก Supabase
   */
  const loadNotifications = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setNotifications(data as NotificationItem[]);
      }
    } catch (err) {
      console.warn("[Notifications] ไม่สามารถโหลดแจ้งเตือนได้:", err);
    }
  }, []);

  // โหลดเมื่อเข้าหน้านี้
  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  // ตั้งค่า Realtime Subscription รับการแจ้งเตือนสดทันทีที่ Admin กดเปลี่ยนสถานะ
  useEffect(() => {
    let channel: any = null;
    let isMounted = true;

    const setupRealtime = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user || !isMounted) return;

      const channelName = `home-notifs-${authData.user.id}-${Date.now()}`;
      const newChannel = supabase.channel(channelName);

      newChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${authData.user.id}`,
        },
        () => {
          void loadNotifications();
        }
      );

      if (!isMounted) return;
      channel = newChannel;
      channel.subscribe();
    };

    void setupRealtime();

    return () => {
      isMounted = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadNotifications]);

  /**
   * ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
   */
  const markAllAsRead = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      // ปรับใน State ทันทีเพื่อให้ UI อัปเดตทันใจ
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", authData.user.id)
        .eq("is_read", false);
    } catch (err) {
      console.warn("markAllAsRead catch:", err);
    }
  };

  /**
   * กดเปิดดูการแจ้งเตือนรายการใดรายการหนึ่ง
   */
  const handlePressNotification = async (item: NotificationItem) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      void supabase.from("notifications").update({ is_read: true }).eq("id", item.id);
    }
    setNotifModalVisible(false);

    // พาย้ายไปยังหน้าประวัติเพื่อดูรายละเอียดใบสมัคร
    router.push("/history");
  };

  const menuItems = [
    {
      title: t.home.newScreening,
      subtitle: t.home.newScreeningSub,
      icon: "file-search-outline" as const,
      color: "#DC2626",
      background: "#FEE2E2",
      onPress: () => router.push("/select-position"),
    },
    {
      title: t.home.assessments,
      subtitle: t.home.assessmentsSub,
      icon: "chart-areaspline" as const,
      color: "#059669",
      background: "#D1FAE5",
      onPress: () => router.push("/result"),
    },
    {
      title: t.home.history,
      subtitle: t.home.historySub,
      icon: "history" as const,
      color: "#2563EB",
      background: "#DBEAFE",
      onPress: () => router.push("/history"),
    },
    {
      title: t.home.profile,
      subtitle: t.home.profileSub,
      icon: "account-tie-outline" as const,
      color: "#7C3AED",
      background: "#EDE9FE",
      onPress: () => router.push("/profile"),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#FFFFFF", "#F4F5F7", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <View style={styles.backgroundOrbOne} />
        <View style={styles.backgroundOrbTwo} />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <View style={styles.headerTopRow}>
              <View>
                <Text style={styles.eyebrow}>{t.home.eyebrow}</Text>
                <Text style={styles.welcome}>{t.home.welcome}</Text>
              </View>
              <View style={styles.headerActions}>
                {/* สลับภาษา TH / EN */}
                <View style={styles.languageSwitch}>
                  <TouchableOpacity
                    style={[styles.languageOption, language === "th" && styles.activeLanguage]}
                    onPress={() => void setLanguage("th")}
                  >
                    <Text style={[styles.languageText, language === "th" && styles.activeLanguageText]}>TH</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.languageOption, language === "en" && styles.activeLanguage]}
                    onPress={() => void setLanguage("en")}
                  >
                    <Text style={[styles.languageText, language === "en" && styles.activeLanguageText]}>EN</Text>
                  </TouchableOpacity>
                </View>

                {/* ปุ่มกระดิ่งแจ้งเตือน (Notification Bell) พร้อมจุดแดงแจ้งเตือน */}
                <TouchableOpacity
                  style={styles.notificationButton}
                  activeOpacity={0.7}
                  onPress={() => {
                    setNotifModalVisible(true);
                    void loadNotifications();
                  }}
                >
                  <MaterialCommunityIcons
                    name={unreadCount > 0 ? "bell-ring-outline" : "bell-outline"}
                    size={20}
                    color={unreadCount > 0 ? "#DC2626" : "#1F2937"}
                  />
                  {unreadCount > 0 ? (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.title}>TonYourTires</Text>
            <Text style={styles.subtitle}>{t.home.subtitle}</Text>
          </Animated.View>

          <Animated.View entering={FadeInRight.duration(750)}>
            <LinearGradient
              colors={["#111111", "#9F151B", "#E3262E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroTopLine}>
                <View style={styles.systemStatus}>
                  <Animated.View style={[styles.statusPulse, pulseStyle]} />
                  <View style={styles.statusDot} />
                  <Text style={styles.systemStatusText}>{t.home.systemOnline}</Text>
                </View>
                <MaterialCommunityIcons name="creation" size={22} color="#FFFFFF" />
              </View>

              <View style={styles.heroContent}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>{t.home.heroTitle}</Text>
                  <Text style={styles.heroSub}>{t.home.heroSub}</Text>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    activeOpacity={0.85}
                    onPress={() => router.push("/select-position")}
                  >
                    <Text style={styles.primaryButtonText}>{t.home.screenCandidate}</Text>
                    <MaterialCommunityIcons name="arrow-up-right" size={20} color="#B91C1C" />
                  </TouchableOpacity>
                </View>

                <View style={styles.aiVisual}>
                  <Animated.View style={[styles.aiHalo, pulseStyle]} />
                  <View style={styles.aiCore}>
                    <MaterialCommunityIcons name="brain" size={42} color="#F5C56B" />
                  </View>
                  <Animated.View style={[styles.scanLine, scanStyle]} />
                  <View style={styles.aiOrbit} />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(500)} style={styles.menuSection}>
            <View style={styles.menuHeading}>
              <Text style={styles.menuTitle}>{t.home.workspace}</Text>
              <MaterialCommunityIcons name="dots-horizontal" size={24} color="#6B7280" />
            </View>
            <View style={styles.menuGrid}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.title}
                  style={styles.menuCard}
                  onPress={item.onPress}
                  activeOpacity={0.82}
                >
                  <View style={styles.menuCardTop}>
                    <View style={[styles.menuIcon, { backgroundColor: item.background }]}>
                      <MaterialCommunityIcons name={item.icon} size={25} color={item.color} />
                    </View>
                    <MaterialCommunityIcons name="arrow-up-right" size={19} color="#64748B" />
                  </View>
                  <Text style={styles.menuCardTitle}>{item.title}</Text>
                  <Text style={styles.menuCardSub}>{item.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>

      {/* ============================================================ */}
      {/* Modal หน้าต่างรายการแจ้งเตือน (Notifications Bottom Sheet) */}
      {/* ============================================================ */}
      <Modal
        visible={notifModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.notifModalOverlay}
          activeOpacity={1}
          onPress={() => setNotifModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.notifModalContainer}>
            {/* เส้น Indicator บาร์หัว Modal */}
            <View style={styles.modalBar} />

            {/* แถบหัวข้อและปุ่มควบคุม */}
            <View style={styles.notifHeaderRow}>
              <View style={styles.notifHeaderTitleWrap}>
                <View style={styles.notifBellIconBox}>
                  <MaterialCommunityIcons name="bell-ring" size={18} color="#DC2626" />
                </View>
                <Text style={styles.notifModalTitle}>Notifications</Text>
                {unreadCount > 0 ? (
                  <View style={styles.notifUnreadPill}>
                    <Text style={styles.notifUnreadPillText}>{unreadCount} New</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.notifHeaderActions}>
                {unreadCount > 0 ? (
                  <TouchableOpacity
                    style={styles.markAllReadBtn}
                    onPress={markAllAsRead}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.markAllReadText}>Mark all read</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.notifCloseBtn}
                  onPress={() => setNotifModalVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* รายการข้อความแจ้งเตือน */}
            {notifications.length === 0 ? (
              <View style={styles.emptyNotifWrap}>
                <View style={styles.emptyNotifIconWrap}>
                  <MaterialCommunityIcons name="bell-sleep-outline" size={40} color="#94A3B8" />
                </View>
                <Text style={styles.emptyNotifTitle}>No notifications at this time</Text>
                <Text style={styles.emptyNotifSub}>
                  When HR or the system updates your application status, notifications will appear here.
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                style={styles.notifList}
                contentContainerStyle={styles.notifListContent}
                renderItem={({ item }) => {
                  const theme = getNotifTheme(item.type, item.title);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.notifCard,
                        !item.is_read && styles.notifCardUnread,
                        { borderColor: !item.is_read ? theme.border : "#F1F5F9" },
                      ]}
                      activeOpacity={0.75}
                      onPress={() => void handlePressNotification(item)}
                    >
                      <View style={[styles.notifIconWrap, { backgroundColor: theme.bg }]}>
                        <MaterialCommunityIcons name={theme.icon} size={22} color={theme.color} />
                      </View>

                      <View style={styles.notifContent}>
                        <View style={styles.notifTopLine}>
                          <Text
                            style={[
                              styles.notifCardTitle,
                              !item.is_read && styles.notifCardTitleUnread,
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          {!item.is_read ? <View style={styles.unreadDot} /> : null}
                        </View>
                        <Text style={styles.notifCardMessage}>{item.message}</Text>
                        <Text style={styles.notifCardTime}>{formatNotifTime(item.created_at)}</Text>
                      </View>

                      <MaterialCommunityIcons name="chevron-right" size={18} color="#CBD5E1" />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  background: { flex: 1, overflow: "hidden" },
  backgroundOrbOne: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "#FECACA", opacity: 0.24, top: -160, right: -100 },
  backgroundOrbTwo: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "#DBEAFE", opacity: 0.3, bottom: 80, left: -170 },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 46 },
  header: { marginBottom: 22 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  eyebrow: { color: "#DC2626", fontSize: 10, fontWeight: "800", letterSpacing: 1.8, marginBottom: 8 },
  welcome: { color: "#4B5563", fontSize: 14, fontWeight: "600" },
  title: { color: "#111827", fontSize: 31, fontWeight: "800", marginTop: 19, letterSpacing: 0.2 },
  subtitle: { color: "#6B7280", fontSize: 12, fontWeight: "700", marginTop: 4, letterSpacing: 0.5 },
  languageSwitch: { flexDirection: "row", backgroundColor: "#E5E7EB", borderRadius: 10, padding: 3 },
  languageOption: { minWidth: 32, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 7, alignItems: "center" },
  activeLanguage: { backgroundColor: "#FFFFFF" },
  languageText: { color: "#6B7280", fontSize: 10, fontWeight: "800" },
  activeLanguageText: { color: "#DC2626" },

  // Notification Bell Button & Badge
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#DC2626",
    top: -4,
    right: -4,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  heroCard: { borderRadius: 22, padding: 20, minHeight: 280, overflow: "hidden", shadowColor: "#991B1B", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 8 },
  heroTopLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  systemStatus: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusPulse: { position: "absolute", width: 18, height: 18, borderRadius: 9, backgroundColor: "#FCA5A5" },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
  systemStatusText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  heroContent: { flex: 1, flexDirection: "row", alignItems: "center", marginTop: 25 },
  heroCopy: { flex: 1, paddingRight: 12 },
  heroTitle: { color: "#FFFFFF", fontSize: 28, lineHeight: 32, fontWeight: "800" },
  heroSub: { color: "#FEE2E2", fontSize: 13, lineHeight: 19, marginTop: 10 },
  primaryButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, marginTop: 18 },
  primaryButtonText: { color: "#B91C1C", fontSize: 12, fontWeight: "800" },
  aiVisual: { width: 120, height: 150, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  aiHalo: { position: "absolute", width: 115, height: 115, borderRadius: 58, backgroundColor: "#FFFFFF", opacity: 0.16 },
  aiCore: { width: 78, height: 78, borderRadius: 39, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.55)", alignItems: "center", justifyContent: "center" },
  aiOrbit: { position: "absolute", width: 112, height: 70, borderRadius: 56, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)", transform: [{ rotate: "-28deg" }] },
  scanLine: { position: "absolute", height: 2, width: 105, backgroundColor: "#FFFFFF", opacity: 0.9, shadowColor: "#FFFFFF", shadowOpacity: 0.8, shadowRadius: 8 },
  menuSection: { marginTop: 22 },
  menuHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  menuTitle: { color: "#111827", fontSize: 19, fontWeight: "800" },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  menuCard: { width: "48.3%", minHeight: 155, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#111827", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  menuCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  menuIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  menuCardTitle: { color: "#111827", fontSize: 14, fontWeight: "800" },
  menuCardSub: { color: "#6B7280", fontSize: 11, lineHeight: 16, marginTop: 5 },

  // Notification Modal Styles
  notifModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  notifModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "82%",
    minHeight: 320,
  },
  modalBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 14,
  },
  notifHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 8,
  },
  notifHeaderTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notifBellIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  notifModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  notifUnreadPill: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  notifUnreadPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  notifHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  markAllReadBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  markAllReadText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  notifCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  // Notification List Styles
  notifList: {
    flexGrow: 0,
  },
  notifListContent: {
    paddingVertical: 10,
    gap: 10,
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 12,
  },
  notifCardUnread: {
    backgroundColor: "#F8FAFC",
  },
  notifIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: {
    flex: 1,
  },
  notifTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  notifCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  notifCardTitleUnread: {
    fontWeight: "800",
    color: "#0F172A",
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#DC2626",
    marginLeft: 6,
  },
  notifCardMessage: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
  notifCardTime: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 5,
    fontWeight: "500",
  },

  // Empty State Styles
  emptyNotifWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 46,
    paddingHorizontal: 20,
  },
  emptyNotifIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyNotifTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  emptyNotifSub: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
});
