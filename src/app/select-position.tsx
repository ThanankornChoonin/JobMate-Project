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

interface JobItem {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

export default function SelectPosition() {
  const router = useRouter();

  const jobs: JobItem[] = [
    {
      title: "Frontend Developer",
      subtitle: "React, Vue, Web Performance & UI",
      icon: "laptop",
      color: "#2563EB",
    },
    {
      title: "Backend Developer",
      subtitle: "Node.js, Databases, API Architecture",
      icon: "server-network",
      color: "#0891B2",
    },
    {
      title: "Full Stack Developer",
      subtitle: "End-to-End Web & System Design",
      icon: "layers-triple-outline",
      color: "#7C3AED",
    },
    {
      title: "Mobile Developer",
      subtitle: "React Native, iOS, Android Apps",
      icon: "cellphone-cog",
      color: "#D97706",
    },
    {
      title: "Data Analyst",
      subtitle: "SQL, Python, Visualization & Insights",
      icon: "chart-box-outline",
      color: "#059669",
    },
    {
      title: "UX/UI Designer",
      subtitle: "Figma, Wireframing, User Research",
      icon: "palette-outline",
      color: "#DB2777",
    },
  ];

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
        <Text style={styles.topBarTitle}>Select Position</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.headerTitle}>Target Role</Text>
        <Text style={styles.headerSub}>
          Choose the position you'd like to simulate an AI interview for.
        </Text>

        {/* Job Category Cards */}
        {jobs.map((job) => (
          <TouchableOpacity
            key={job.title}
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
        ))}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    color: "#64748B",
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
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
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
    color: "#0F172A",
    marginBottom: 2,
  },
  jobSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  chevron: {
    marginLeft: 8,
  },
});