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

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function CVResult() {
  const router = useRouter();
  const { position, result } = useLocalSearchParams();
  const response = result ? JSON.parse(result as string) : null;

  const cvId = response?.cv_id;

  const data = response?.analysis ?? {
    score: 0,
    status: "",
    strengths: [],
    weaknesses: [],
    suggestions: [],
  };

  const questions = response?.questions?.questions ?? [];
  const isPassed = data.score >= 50;

  // Animation สำหรับปุ่มกด
  const buttonScale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const onPressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 15 });
  };
  const onPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15 });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isPassed ? "#DCFCE7" : "#FEE2E2" },
            ]}
          >
            <MaterialCommunityIcons
              name={isPassed ? "file-check" : "file-remove"}
              size={56}
              color={isPassed ? "#16A34A" : "#DC2626"}
            />
          </View>

          <Text style={styles.title}>Candidate Evaluation</Text>

          <View style={styles.scoreContainer}>
            <Text style={[styles.score, { color: isPassed ? "#16A34A" : "#DC2626" }]}>
              {data.score}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>

          <View
            style={[
              styles.statusTag,
              { backgroundColor: isPassed ? "#EFF6FF" : "#FEF2F2" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isPassed ? "#2563EB" : "#DC2626" },
              ]}
            >
              {data.status || (isPassed ? "Passed" : "Rejected")}
            </Text>
          </View>

          {position && (
            <View style={styles.positionBadge}>
              <MaterialCommunityIcons
                name="briefcase-outline"
                size={16}
                color="#64748B"
              />
              <Text style={styles.positionText}>{position}</Text>
            </View>
          )}
        </View>

        {/* Evaluation Sections */}
        {/* Strengths */}
        {data.strengths?.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: "#DCFCE7" }]}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={20}
                  color="#16A34A"
                />
              </View>
              <Text style={styles.sectionTitle}>Strengths</Text>
            </View>
            {data.strengths.map((item: string, index: number) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.bullet, { color: "#16A34A" }]}>•</Text>
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Weaknesses */}
        {data.weaknesses?.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: "#FEF3C7" }]}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={20}
                  color="#D97706"
                />
              </View>
              <Text style={styles.sectionTitle}>Weaknesses</Text>
            </View>
            {data.weaknesses.map((item: string, index: number) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.bullet, { color: "#D97706" }]}>•</Text>
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Suggestions */}
        {data.suggestions?.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: "#E0F2FE" }]}>
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={20}
                  color="#0284C7"
                />
              </View>
              <Text style={styles.sectionTitle}>Suggestions</Text>
            </View>
            {data.suggestions.map((item: string, index: number) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.bullet, { color: "#0284C7" }]}>•</Text>
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Bottom Section */}
        {isPassed ? (
          <AnimatedTouchableOpacity
            style={[styles.primaryButton, animatedButtonStyle]}
            activeOpacity={0.9}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={() =>
              router.push({
                pathname: "/interview",
                params: {
                  cv_id: cvId,
                  position,
                  questions: JSON.stringify(questions),
                },
              })
            }
          >
            <Text style={styles.primaryButtonText}>Start Interview</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
          </AnimatedTouchableOpacity>
        ) : (
          <View style={styles.rejectedContainer}>
            <View style={styles.rejectedBanner}>
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={36}
                color="#DC2626"
              />
              <Text style={styles.rejectedTitle}>CV Rejected</Text>
              <Text style={styles.rejectedSub}>
                Your CV score is below 50. Please improve your CV before taking the interview.
              </Text>
            </View>

            <AnimatedTouchableOpacity
              style={[styles.homeButton, animatedButtonStyle]}
              activeOpacity={0.9}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={() => router.replace("/home")}
            >
              <MaterialCommunityIcons name="home-outline" size={20} color="#0F172A" />
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </AnimatedTouchableOpacity>
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
    shadowOffset: { width: 0, height: 4 },
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
    shadowOffset: { width: 0, height: 6 },
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