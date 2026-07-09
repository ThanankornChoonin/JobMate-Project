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
import { supabase } from "../lib/supabase";

export default function Profile() {
  const router = useRouter();

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

      <Text style={styles.name}>Thanankorn</Text>

      <Text style={styles.email}>IT Student</Text>

      <View style={styles.card}>
        <Text style={styles.item}>🎓 Major : Information Technology</Text>
        <Text style={styles.item}>💼 Dream Job : Software Developer</Text>
        <Text style={styles.item}>🌎 Language : English / Thai</Text>
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