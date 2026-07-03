import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function Profile() {
  return (
    <SafeAreaView style={styles.container}>

      <MaterialCommunityIcons
        name="account-circle"
        size={120}
        color="#2563EB"
      />

      <Text style={styles.name}>Thanankorn</Text>

      <Text style={styles.email}>
        IT Student
      </Text>

      <View style={styles.card}>
        <Text style={styles.item}>🎓 Major : Information Technology</Text>
        <Text style={styles.item}>💼 Dream Job : Software Developer</Text>
        <Text style={styles.item}>🌎 Language : English / Thai</Text>
      </View>

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
});