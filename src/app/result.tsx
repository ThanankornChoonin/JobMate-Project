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

export default function Result() {
  const router = useRouter();
  const { result } = useLocalSearchParams();

  const data = result
    ? JSON.parse(result as string)
    : {
        score: 0,
        level: "Unknown",
        strengths: [],
        weaknesses: [],
        suggestions: [],
      };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={80}
            color="#22C55E"
          />

          <Text style={styles.title}>Interview Complete</Text>

          <Text style={styles.score}>
            {data.score} / 100
          </Text>

          <Text style={styles.level}>
            {data.level}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>
            💪 Strengths
          </Text>

          {data.strengths.map((item: string, index: number) => (
            <Text key={index} style={styles.item}>
              ✅ {item}
            </Text>
          ))}

          <Text style={styles.section}>
            📉 Weaknesses
          </Text>

          {data.weaknesses.map((item: string, index: number) => (
            <Text key={index} style={styles.item}>
              • {item}
            </Text>
          ))}

          <Text style={styles.section}>
            💡 Suggestions
          </Text>

          {data.suggestions.map((item: string, index: number) => (
            <Text key={index} style={styles.item}>
              ✔ {item}
            </Text>
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/home")}
        >
          <Text style={styles.buttonText}>
            Back Home
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FC",
  },

  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 20,
    color: "#111827",
  },

  score: {
    fontSize: 52,
    fontWeight: "bold",
    color: "#22C55E",
    marginTop: 20,
  },

  level: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2563EB",
    marginTop: 8,
  },

  card: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 22,
    marginTop: 20,
  },

  section: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 10,
    color: "#111827",
  },

  item: {
    fontSize: 16,
    color: "#4B5563",
    marginBottom: 10,
    lineHeight: 24,
  },

  button: {
    backgroundColor: "#2563EB",
    margin: 20,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});