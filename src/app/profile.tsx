import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [totalInterview, setTotalInterview] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [highestScore, setHighestScore] = useState(0);
  const [favoritePosition, setFavoritePosition] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("interview_history")
        .select("*")
        .eq("user_id", user.id);

      if (!data) return;

      setTotalInterview(data.length);

      if (data.length > 0) {
        const scores = data.map((i) => i.score);

        const avg =
          scores.reduce((a, b) => a + b, 0) /
          scores.length;

        setAverageScore(avg);
        setHighestScore(Math.max(...scores));

        const count: Record<string, number> = {};

        data.forEach((i) => {
          count[i.position] = (count[i.position] || 0) + 1;
        });

        const favorite = Object.keys(count).reduce((a, b) =>
          count[a] > count[b] ? a : b
        );

        setFavoritePosition(favorite);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert("Error", error.message);
            return;
          }
          router.replace("/login");
        },
      },
    ]);
  };

  const userName = email ? email.split("@")[0] : "User";

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Profile Card Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.onlineBadge} />
          </View>

          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.email}>{email || "candidate@tonyourtires.com"}</Text>

          <View style={styles.roleBadge}>
            <MaterialCommunityIcons name="shield-check" size={14} color="#2563EB" />
            <Text style={styles.roleBadgeText}>Candidate Member</Text>
          </View>
        </View>

        {/* Performance Statistics Overview */}
        <Text style={styles.sectionHeaderTitle}>Performance Overview</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {/* Stat Item 1: Total Interviews */}
            <View style={styles.statCard}>
              <View style={[styles.iconBg, { backgroundColor: "#EFF6FF" }]}>
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={22}
                  color="#2563EB"
                />
              </View>
              <Text style={styles.statNumber}>{totalInterview}</Text>
              <Text style={styles.statTitle}>Total Completed</Text>
            </View>

            {/* Stat Item 2: Average Score */}
            <View style={styles.statCard}>
              <View style={[styles.iconBg, { backgroundColor: "#FEF3C7" }]}>
                <MaterialCommunityIcons
                  name="star-outline"
                  size={22}
                  color="#D97706"
                />
              </View>
              <Text style={styles.statNumber}>{averageScore.toFixed(1)}</Text>
              <Text style={styles.statTitle}>Average Score</Text>
            </View>

            {/* Stat Item 3: Highest Score */}
            <View style={styles.statCard}>
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <MaterialCommunityIcons
                  name="trophy-outline"
                  size={22}
                  color="#16A34A"
                />
              </View>
              <Text style={styles.statNumber}>{highestScore}</Text>
              <Text style={styles.statTitle}>Highest Score</Text>
            </View>

            {/* Stat Item 4: Favorite Position */}
            <View style={styles.statCard}>
              <View style={[styles.iconBg, { backgroundColor: "#F3E8FF" }]}>
                <MaterialCommunityIcons
                  name="briefcase-outline"
                  size={22}
                  color="#8B5CF6"
                />
              </View>
              <Text
                style={[styles.statNumber, styles.favPositionText]}
                numberOfLines={1}
              >
                {favoritePosition || "N/A"}
              </Text>
              <Text style={styles.statTitle}>Top Focus Job</Text>
            </View>
          </View>
        )}

        {/* Action Button Section */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out Account</Text>
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
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
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
    elevation: 3,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
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
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
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
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
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
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  favPositionText: {
    fontSize: 16,
    lineHeight: 28,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
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