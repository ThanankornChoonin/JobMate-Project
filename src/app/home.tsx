import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
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
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// Component ปุ่มกดที่สเกลตามแรงกด (Animated Pressable)
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function Home() {
  const router = useRouter();

  // Reanimated Values สำหรับ Animation ต่างๆ
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  React.useEffect(() => {
    // เอฟเฟกต์Pulse หัวหุ่นยนต์เรืองแสงขยับตลอดเวลา
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1200 }),
        withTiming(0.6, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // สร้างฟังก์ชันสำหรับจัดการ Animation เวลาแตะการ์ดแต่ละใบ
  const createCardPressHandler = () => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const onPressIn = () => {
      scale.value = withSpring(0.95, { damping: 15 });
    };
    const onPressOut = () => {
      scale.value = withSpring(1, { damping: 15 });
    };

    return { animatedStyle, onPressIn, onPressOut };
  };

  const card1 = createCardPressHandler();
  const card2 = createCardPressHandler();
  const card3 = createCardPressHandler();
  const card4 = createCardPressHandler();
  const heroBtn = createCardPressHandler();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcome}>👋 Welcome back,</Text>
          <Text style={styles.title}>TonYourTires</Text>
          <Text style={styles.subtitle}>Recruitment AI Platform</Text>
        </View>

        {/* Hero Banner Gradated with Pulse Animation */}
        <LinearGradient
          colors={["#EF4444", "#DC2626", "#991B1B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroHeader}>
            {/* Pulse Aura Effect ด้านหลังไอคอน */}
            <View style={styles.iconWrapper}>
              <Animated.View style={[styles.pulseAura, pulseStyle]} />
              <View style={styles.heroIconContainer}>
                <MaterialCommunityIcons
                  name="robot-excited"
                  size={32}
                  color="#DC2626"
                />
              </View>
            </View>

            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Ready for interview?</Text>
              <Text style={styles.heroSub}>
                Practice with AI & receive instant feedback.
              </Text>
            </View>
          </View>

          {/* Animated Start Button */}
          <AnimatedTouchableOpacity
            style={[styles.startButton, heroBtn.animatedStyle]}
            activeOpacity={0.9}
            onPressIn={heroBtn.onPressIn}
            onPressOut={heroBtn.onPressOut}
            onPress={() => router.push("/select-position")}
          >
            <Text style={styles.startButtonText}>Start Interview</Text>
            <MaterialCommunityIcons
              name="arrow-right-circle"
              size={22}
              color="#DC2626"
            />
          </AnimatedTouchableOpacity>
        </LinearGradient>

        {/* Quick Actions Title */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.grid}>
          {/* Card 1: Interview */}
          <AnimatedTouchableOpacity
            style={[styles.card, card1.animatedStyle]}
            activeOpacity={0.9}
            onPressIn={card1.onPressIn}
            onPressOut={card1.onPressOut}
            onPress={() => router.push("/select-position")}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconBg, { backgroundColor: "#FEE2E2" }]}>
                <MaterialCommunityIcons
                  name="robot-outline"
                  size={26}
                  color="#DC2626"
                />
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#9CA3AF"
              />
            </View>
            <Text style={styles.cardTitle}>Interview</Text>
            <Text style={styles.cardSub}>Start AI interview</Text>
          </AnimatedTouchableOpacity>

          {/* Card 2: Results */}
          <AnimatedTouchableOpacity
            style={[styles.card, card2.animatedStyle]}
            activeOpacity={0.9}
            onPressIn={card2.onPressIn}
            onPressOut={card2.onPressOut}
            onPress={() => router.push("/result")}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={26}
                  color="#16A34A"
                />
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#9CA3AF"
              />
            </View>
            <Text style={styles.cardTitle}>Results</Text>
            <Text style={styles.cardSub}>View your score</Text>
          </AnimatedTouchableOpacity>

          {/* Card 3: History */}
          <AnimatedTouchableOpacity
            style={[styles.card, card3.animatedStyle]}
            activeOpacity={0.9}
            onPressIn={card3.onPressIn}
            onPressOut={card3.onPressOut}
            onPress={() => router.push("/history")}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconBg, { backgroundColor: "#FEF3C7" }]}>
                <MaterialCommunityIcons
                  name="history"
                  size={26}
                  color="#D97706"
                />
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#9CA3AF"
              />
            </View>
            <Text style={styles.cardTitle}>History</Text>
            <Text style={styles.cardSub}>Previous interviews</Text>
          </AnimatedTouchableOpacity>

          {/* Card 4: Profile */}
          <AnimatedTouchableOpacity
            style={[styles.card, card4.animatedStyle]}
            activeOpacity={0.9}
            onPressIn={card4.onPressIn}
            onPressOut={card4.onPressOut}
            onPress={() => router.push("/profile")}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconBg, { backgroundColor: "#F3E8FF" }]}>
                <MaterialCommunityIcons
                  name="account-circle-outline"
                  size={26}
                  color="#8B5CF6"
                />
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#9CA3AF"
              />
            </View>
            <Text style={styles.cardTitle}>Profile</Text>
            <Text style={styles.cardSub}>Manage account</Text>
          </AnimatedTouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  welcome: {
    fontSize: 15,
    fontWeight: "500",
    color: "#64748B",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 28,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconWrapper: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  pulseAura: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "white",
  },
  heroIconContainer: {
    width: 52,
    height: 52,
    backgroundColor: "white",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    color: "white",
    fontWeight: "800",
  },
  heroSub: {
    color: "#FEE2E2",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  startButton: {
    backgroundColor: "white",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 3,
  },
  startButtonText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
    color: "#0F172A",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
});