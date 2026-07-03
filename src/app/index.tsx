import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Home() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >

      {/* Header */}
      <Text style={styles.welcome}>👋 Welcome</Text>

      <Text style={styles.title}>JobMate AI</Text>

      <Text style={styles.subtitle}>
        Practice interviews with AI and improve your confidence.
      </Text>

      {/* Hero Card */}
      <View style={styles.heroCard}>

        <MaterialCommunityIcons
          name="robot-excited-outline"
          size={60}
          color="white"
        />

        <Text style={styles.heroTitle}>
          Ready for your interview?
        </Text>

        <Text style={styles.heroSub}>
          Practice with AI and receive instant feedback.
        </Text>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push("/select-position")}
        >
          <Text style={styles.startButtonText}>
            Start Interview
          </Text>
        </TouchableOpacity>

      </View>
            {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.grid}>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/select-position")}
        >
          <MaterialCommunityIcons
            name="robot-outline"
            size={38}
            color="#2563EB"
          />

          <Text style={styles.cardTitle}>
            Interview
          </Text>

          <Text style={styles.cardSub}>
            Start AI interview
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/result")}
        >
          <MaterialCommunityIcons
            name="chart-line"
            size={38}
            color="#16A34A"
          />

          <Text style={styles.cardTitle}>
            Results
          </Text>

          <Text style={styles.cardSub}>
            View your score
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/history")}
        >
          <MaterialCommunityIcons
            name="history"
            size={38}
            color="#F59E0B"
          />

          <Text style={styles.cardTitle}>
            History
          </Text>

          <Text style={styles.cardSub}>
            Previous interviews
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/profile")}
        >
          <MaterialCommunityIcons
            name="account-circle"
            size={38}
            color="#8B5CF6"
          />

          <Text style={styles.cardTitle}>
            Profile
          </Text>

          <Text style={styles.cardSub}>
            Manage account
          </Text>

        </TouchableOpacity>

      </View>
          </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FC",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  welcome: {
    fontSize: 18,
    color: "#64748B",
  },

  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#2563EB",
    marginTop: 5,
  },

  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 25,
    lineHeight: 22,
  },

  heroCard: {
    backgroundColor: "#2563EB",
    borderRadius: 24,
    padding: 25,
    marginBottom: 30,
  },

  heroTitle: {
    fontSize: 24,
    color: "white",
    fontWeight: "bold",
    marginTop: 15,
  },

  heroSub: {
    color: "#DBEAFE",
    marginTop: 10,
    lineHeight: 22,
  },

  startButton: {
    backgroundColor: "white",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },

  startButtonText: {
    color: "#2563EB",
    fontWeight: "bold",
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 18,
    color: "#111827",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
    card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 4,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 12,
    color: "#111827",
  },

  cardSub: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 5,
  },
});