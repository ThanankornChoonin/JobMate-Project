import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [totalInterview, setTotalInterview] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [highestScore, setHighestScore] = useState(0);
  const [favoritePosition, setFavoritePosition] = useState("");
  useEffect(() => {
  loadProfile();
}, []);

const loadProfile = async () => {
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
      count[i.position] =
        (count[i.position] || 0) + 1;
    });

    const favorite = Object.keys(count).reduce(
      (a, b) =>
        count[a] > count[b] ? a : b
    );

    setFavoritePosition(favorite);
  }
};
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <MaterialCommunityIcons
        name="account-circle"
        size={120}
        color="#2563EB"
      />

      <Text style={styles.name}>
    {email ? email.split("@")[0] : "User"}
      </Text>

      <Text style={styles.email}>
            {email}
            </Text>

      <View style={styles.statsContainer}>

  <View style={styles.statCard}>
    <MaterialCommunityIcons
      name="clipboard-text-outline"
      size={32}
      color="#2563EB"
    />
    <Text style={styles.statNumber}>
      {totalInterview}
    </Text>
    <Text style={styles.statTitle}>
      Interviews
    </Text>
  </View>

  <View style={styles.statCard}>
    <MaterialCommunityIcons
      name="star-outline"
      size={32}
      color="#2563EB"
    />
    <Text style={styles.statNumber}>
      {averageScore.toFixed(1)}
    </Text>
    <Text style={styles.statTitle}>
      Average
    </Text>
  </View>

  <View style={styles.statCard}>
    <MaterialCommunityIcons
      name="trophy-outline"
      size={32}
      color="#2563EB"
    />
    <Text style={styles.statNumber}>
      {highestScore}
    </Text>
    <Text style={styles.statTitle}>
      Highest
    </Text>
  </View>

  <View style={styles.statCard}>
    <MaterialCommunityIcons
      name="briefcase-outline"
      size={32}
      color="#2563EB"
    />
    <Text
      style={[
        styles.statNumber,
        {
          fontSize: 16,
          textAlign: "center",
        },
      ]}
    >
      {favoritePosition || "-"}
    </Text>
    <Text style={styles.statTitle}>
      Favorite Position
    </Text>
  </View>

</View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FC",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  name: {
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 20,
  },

  email: {
    color: "#64748B",
    marginBottom: 30,
  },

  card: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
  },

  item: {
  fontSize: 18,
  marginBottom: 18,
},

statsContainer: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  width: "100%",
},

statCard: {
  width: "48%",
  backgroundColor: "white",
  borderRadius: 18,
  paddingVertical: 20,
  marginBottom: 15,
  alignItems: "center",

  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 4,
},

statNumber: {
  fontSize: 28,
  fontWeight: "bold",
  color: "#2563EB",
  marginTop: 10,
},

statTitle: {
  color: "#64748B",
  marginTop: 5,
},

  logoutButton: {
    width: "100%",
    backgroundColor: "#EF4444",
    padding: 15,
    borderRadius: 12,
    marginTop: 30,
    alignItems: "center",
  },

  logoutText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});