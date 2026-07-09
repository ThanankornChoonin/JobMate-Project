import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function History() {
const [history, setHistory] = useState<any[]>([]);

useEffect(() => {
  loadHistory();
}, []);

const loadHistory = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase
    .from("interview_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
  console.log(error);
  return;
}

if (data) {
  setHistory(data);
}
};

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Interview History</Text>
      {history.length === 0 && (
    <Text style={{ textAlign: "center", color: "#64748B" }}>
    No interview history yet
    </Text>
        )}
      {history.map((item) => (
        <View key={item.id} style={styles.card}>
          <MaterialCommunityIcons
            name="history"
            size={35}
            color="#2563EB"
          />

          <View style={{ marginLeft: 15 }}>
  <Text style={styles.job}>
  {item.level}
</Text>
  <Text style={styles.score}>
    ⭐ {item.score}/100
  </Text>

  <Text style={styles.date}>
    {new Date(item.created_at).toLocaleDateString()}
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