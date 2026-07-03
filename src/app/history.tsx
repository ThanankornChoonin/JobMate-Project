import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function History() {
  const history = [
    { job: "Frontend Developer", score: 86 },
    { job: "Backend Developer", score: 81 },
    { job: "UX/UI Designer", score: 92 },
    { job: "Data Analyst", score: 88 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Interview History</Text>

      {history.map((item, index) => (
        <View key={index} style={styles.card}>
          <MaterialCommunityIcons
            name="history"
            size={35}
            color="#2563EB"
          />

          <View style={{ marginLeft: 15 }}>
  <Text style={styles.job}>{item.job}</Text>

  <Text style={styles.score}>
    ⭐ {item.score}/100
  </Text>

  <Text style={styles.date}>
    3 Jul 2026
  </Text>
</View>
        </View>
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
    marginBottom: 25,
    color: "#2563EB",
  },

  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  job: {
    fontSize: 18,
    fontWeight: "bold",
  },

  score: {
  color: "#64748B",
  marginTop: 5,
},

date: {
  color: "#9CA3AF",
  fontSize: 13,
  marginTop: 4,
},
});