import { useLocalSearchParams } from "expo-router";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function HistoryDetail() {
  const params = useLocalSearchParams();

  const strengths = JSON.parse(
    (params.strengths as string) || "[]"
  );

  const weaknesses = JSON.parse(
    (params.weaknesses as string) || "[]"
  );

  const suggestions = JSON.parse(
    (params.suggestions as string) || "[]"
  );
  const conversation = JSON.parse(
  (params.conversation as string) || "[]"
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>

        <Text style={styles.title}>
          Interview Result
        </Text>

        <Text style={styles.score}>
          Score: {params.score}/100
        </Text>

        <Text style={styles.level}>
          Level: {params.level}
        </Text>

        <View style={styles.card}>
          <Text style={styles.heading}>
            Strengths
          </Text>

          {strengths.map((item: string, index: number) => (
            <Text key={index}>
              • {item}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>
            Weaknesses
          </Text>

          {weaknesses.map((item: string, index: number) => (
            <Text key={index}>
              • {item}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
  <Text style={styles.heading}>
    Suggestions
  </Text>

  {suggestions.map((item: string, index: number) => (
    <Text key={index}>
      • {item}
    </Text>
  ))}
</View>

<View style={styles.card}>
  <Text style={styles.heading}>
    Interview Conversation
  </Text>

  {conversation.map((msg: any, index: number) => (
    <View
      key={index}
      style={{
        alignSelf:
          msg.sender === "user"
            ? "flex-end"
            : "flex-start",

        backgroundColor:
          msg.sender === "user"
            ? "#2563EB"
            : "#E5E7EB",

        padding: 12,
        borderRadius: 12,
        marginVertical: 5,
        maxWidth: "90%",
      }}
    >
      <Text
        style={{
          color:
            msg.sender === "user"
              ? "white"
              : "black",
        }}
      >
        {msg.text}
      </Text>
    </View>
  ))}
</View>

</ScrollView>
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
    fontSize: 28,
    fontWeight: "bold",
    color: "#2563EB",
    marginBottom: 20,
  },

  score: {
    fontSize: 20,
    fontWeight: "bold",
  },

  level: {
    fontSize: 18,
    color: "#64748B",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
  },

  heading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
});