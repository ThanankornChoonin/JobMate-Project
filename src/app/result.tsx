import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Result() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <MaterialCommunityIcons
        name="check-decagram"
        size={80}
        color="#22C55E"
      />

      <Text style={styles.title}>Interview Complete</Text>

      <Text style={styles.score}>86 / 100</Text>

      <View style={styles.card}>
        <Text style={styles.section}>Grammar</Text>

<View style={styles.bar}>
  <View style={[styles.fill, { width: "90%" }]} />
</View>

<Text style={styles.section}>Communication</Text>

<View style={styles.bar}>
  <View style={[styles.fill, { width: "85%" }]} />
</View>

<Text style={styles.section}>Confidence</Text>

<View style={styles.bar}>
  <View style={[styles.fill, { width: "83%" }]} />
</View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/interview")}
      >
        <Text style={styles.buttonText}>Practice Again</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FC",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 20,
  },

  score: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#22C55E",
    marginVertical: 25,
  },

  card: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
    marginBottom: 30,
  },

  item: {
    fontSize: 18,
    marginBottom: 15,
  },

  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 15,
  },

  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  section: {
  fontWeight: "bold",
  marginTop: 10,
  marginBottom: 6,
},

bar: {
  height: 10,
  backgroundColor: "#E5E7EB",
  borderRadius: 10,
  overflow: "hidden",
  marginBottom: 12,
},

fill: {
  height: "100%",
  backgroundColor: "#2563EB",
},
});