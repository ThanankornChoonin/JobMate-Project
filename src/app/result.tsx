import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function Result() {
  const router = useRouter();
  
 

const [data, setData] = useState({
  score: 0,
  level: "",
  strengths: [] as string[],
  weaknesses: [] as string[],
  suggestions: [] as string[],
  position: "",
  created_at: "",
});

useEffect(() => {
  loadLatestResult();
}, []);

const loadLatestResult = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: latest } = await supabase
    .from("interview_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return;

  setData({
    score: latest.score,
    level: latest.level,
    strengths: JSON.parse(latest.strengths || "[]"),
    weaknesses: JSON.parse(latest.weaknesses || "[]"),
    suggestions: JSON.parse(latest.suggestions || "[]"),
    position: latest.position,
    created_at: latest.created_at,
  });
};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {data.score === 0 ? (
  <View
    style={{
      alignItems: "center",
      marginTop: 100,
      paddingHorizontal: 20,
    }}
  >
    <MaterialCommunityIcons
      name="clipboard-text-outline"
      size={80}
      color="#94A3B8"
    />

    <Text
      style={{
        fontSize: 26,
        fontWeight: "bold",
        marginTop: 20,
      }}
    >
      No Interview Yet
    </Text>

    <Text
      style={{
        color: "#64748B",
        textAlign: "center",
        marginTop: 10,
      }}
    >
      Complete an interview to see your latest result.
    </Text>
  </View>
) : (
  <>
    <View style={styles.header}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={80}
            color="#22C55E"
          />

          <Text style={styles.title}>Latest Interview Result</Text>

          <Text style={styles.score}>
            {data.score} / 100
          </Text>

          <Text style={styles.level}>
            {data.level}
          </Text>
          <Text
          style={{
    marginTop: 10,
    color: "#64748B",
    fontSize: 18,
  }}
      >
     💼 {data.position}
    </Text>

      <Text
      style={{
    color: "#64748B",
    marginTop: 5,
  }}
      >
        📅 {data.created_at
    ? new Date(data.created_at).toLocaleDateString()
    : "-"}
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
  </>
)}
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