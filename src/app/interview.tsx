import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Interview() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.title}>AI Interview</Text>

      <Text style={styles.subTitle}>
        Frontend Developer
      </Text>

      <View style={styles.chatCard}>

        <MaterialCommunityIcons
          name="robot-excited-outline"
          size={60}
          color="#2563EB"
        />

        <Text style={styles.question}>
          Tell me about yourself.
        </Text>

        <Text style={styles.tip}>
          Answer in English as if you were in a real interview.
        </Text>

      </View>

      <TextInput
        placeholder="Type your answer..."
        multiline
        style={styles.input}
      />

      <TouchableOpacity style={styles.sendButton}>
        <Text style={styles.sendText}>
          Send Answer
        </Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FC",
    padding: 20,
    justifyContent: "center",
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2563EB",
    textAlign: "center",
  },

  subTitle: {
    textAlign: "center",
    color: "#64748B",
    marginBottom: 30,
    fontSize: 16,
  },

  chatCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    marginBottom: 25,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,

    elevation: 4,
  },

  question: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 15,
    textAlign: "center",
  },

  tip: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },

  input: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    height: 170,
    textAlignVertical: "top",
    marginBottom: 20,
  },

  sendButton: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },

  sendText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
});