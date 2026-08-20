import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

// --- เพิ่มฟังก์ชันทำความสะอาด JSON ---
const parseAIResponse = (rawText: string) => {
  try {
    let cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const firstBrace = cleaned.search(/[\{\[]/);
    const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    // จัดการกรณีมีลูกน้ำ (,) เกินมาตัวสุดท้าย
    cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
    
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("🚨 Clean JSON Error (Raw Data):", rawText);
    throw new Error("รูปแบบข้อมูลจาก AI ไม่สมบูรณ์ กรุณาลองอัปโหลดใหม่อีกครั้ง");
  }
};
// ----------------------------------------

export default function UploadCV() {
  const router = useRouter();
  const { position } = useLocalSearchParams();
  
  const [fileName, setFileName] = useState("");
  const [fileUri, setFileUri] = useState("");
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setFileName(file.name);
      setFileUri(file.uri);
      setFileSize(file.size);
      // Expo DocumentPicker provides the browser File on web. Native platforms
      // use the URI below because they do not provide a browser File object.
      setPdfFile(file.file ?? null);
    } catch (err) {
      Alert.alert("Error", "Failed to select document.");
    }
  };

  const uploadPDF = async () => {
    if (!fileUri) {
      Alert.alert("Required", "Please select a PDF document first.");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      // 1. ดึงข้อมูล User ที่ล็อกอินอยู่ปัจจุบันจาก Supabase
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert("Authentication Error", "Please login first before uploading.");
        return;
      }

      // 2. เตรียม FormData
      const formData = new FormData();

      if (Platform.OS === "web") {
        // `file.file` is available in Expo Web. The Blob fallback also handles
        // browsers/configurations where DocumentPicker only returns a URI.
        const browserFile =
          pdfFile ??
          new File(
            [await (await fetch(fileUri)).blob()],
            fileName || "cv.pdf",
            { type: "application/pdf" }
          );

        formData.append("cv", browserFile, fileName || "cv.pdf");
      } else {
        formData.append("cv", {
          uri: fileUri,
          name: fileName,
          type: "application/pdf",
        } as any);
      }

      formData.append("position", String(position || "General Candidate"));
      formData.append("userId", user.id);

      // 3. ยิง API ไปวิเคราะห์ CV ที่ Backend
      const response = await fetch("http://localhost:3000/cv/upload", {
        method: "POST",
        body: formData,
      });

      // 👇 แก้ไขจาก response.json() มาเป็นดึง text และทำความสะอาดก่อนแปลง
      const rawText = await response.text();

        console.log("BACKEND RAW RESPONSE =", rawText);

          let data;

        try {
      data = JSON.parse(rawText);
      } catch (jsonError) {
          console.log("JSON PARSE ERROR =", jsonError);
      console.log("RAW RESPONSE =", rawText);

      throw new Error("Backend returned invalid JSON");
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "CV analysis failed");
      }

      // 4. ไปยังหน้า cv-result
      router.push({
        pathname: "/cv-result",
        params: {
          position,
          result: JSON.stringify(data),
        },
      });
    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert(
        "Upload Failed",
        error instanceof Error
          ? error.message
          : "Unable to analyze CV. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Upload Resume</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Selected Position Header Badge */}
        {position ? (
          <View style={styles.positionBadge}>
            <MaterialCommunityIcons name="briefcase-outline" size={16} color="#2563EB" />
            <Text style={styles.positionText}>Role: {position}</Text>
          </View>
        ) : null}

        <Text style={styles.title}>Submit Your CV</Text>
        <Text style={styles.subtitle}>
          Upload your latest resume in PDF format for AI matching and skill assessment.
        </Text>

        {/* Upload Dropzone Card */}
        <TouchableOpacity
          style={[
            styles.dropzoneCard,
            fileName ? styles.dropzoneSelected : styles.dropzoneEmpty,
          ]}
          onPress={pickPDF}
          activeOpacity={0.8}
          disabled={loading}
        >
          {fileName ? (
            <View style={styles.fileSelectedState}>
              <View style={styles.pdfIconBadge}>
                <MaterialCommunityIcons name="file-pdf-box" size={44} color="#DC2626" />
              </View>
              <Text style={styles.fileNameText} numberOfLines={1}>
                {fileName}
              </Text>
              {fileSize && (
                <Text style={styles.fileSizeText}>{formatFileSize(fileSize)}</Text>
              )}
              <View style={styles.reselectBtn}>
                <MaterialCommunityIcons name="refresh" size={16} color="#2563EB" />
                <Text style={styles.reselectText}>Change PDF File</Text>
              </View>
            </View>
          ) : (
            <View style={styles.fileEmptyState}>
              <View style={styles.cloudIconBadge}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={42} color="#2563EB" />
              </View>
              <Text style={styles.dropzoneTitle}>Choose PDF Document</Text>
              <Text style={styles.dropzoneSub}>Supports PDF up to 10MB</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            (!fileUri || loading) && styles.actionButtonDisabled,
          ]}
          disabled={!fileUri || loading}
          onPress={uploadPDF}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.actionButtonText}>Analyzing Resume...</Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Analyze Resume with AI</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: "center",
  },
  positionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  positionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
    maxWidth: 300,
  },
  dropzoneCard: {
    width: "100%",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 28,
  },
  dropzoneEmpty: {
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
  },
  dropzoneSelected: {
    borderWidth: 2,
    borderColor: "#2563EB",
    borderStyle: "solid",
    backgroundColor: "#F0F6FF",
  },
  fileEmptyState: {
    alignItems: "center",
  },
  cloudIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  dropzoneTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  dropzoneSub: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  fileSelectedState: {
    alignItems: "center",
    width: "100%",
  },
  pdfIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  fileNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
    textAlign: "center",
  },
  fileSizeText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 16,
  },
  reselectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  reselectText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  actionButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  actionButtonDisabled: {
    backgroundColor: "#94A3B8",
    elevation: 0,
    shadowOpacity: 0,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});