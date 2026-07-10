import { useRouter } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity
} from "react-native";

export default function SelectPosition() {
  const router = useRouter();

  const jobs = [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Mobile Developer",
    "Data Analyst",
    "UX/UI Designer",
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Choose Position</Text>

      {jobs.map((job) => (
        <TouchableOpacity
          key={job}
          style={styles.card}
          onPress={() =>
  router.push({
    pathname: "/interview",
    params: {
      position: job,
    },
  })
}
        >
          <Text style={styles.job}>{job}</Text>
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FC",
    padding: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2563EB",
    marginBottom: 25,
  },

  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    marginBottom: 15,
  },

  job: {
    fontSize: 18,
    fontWeight: "600",
  },
});