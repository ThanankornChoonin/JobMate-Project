/**
 * ============================================================================
 * หน้าจอ: อัปโหลดเรซูเม่ (Upload CV Screen)
 * ============================================================================
 * ไฟล์: src/app/upload-cv.tsx
 *
 * รายละเอียด:
 * - อนุญาตให้ผู้สมัครเลือกไฟล์ CV/Resume ในรูปแบบ PDF จากเครื่อง (หรือเว็บบราวเซอร์)
 * - บันทึกโปรไฟล์พื้นฐาน (email, user id) เข้าสู่ตาราง `profiles` ใน Supabase
 * - ส่งไฟล์ PDF แบบ multipart/form-data ไปยัง Backend API (/cv/upload)
 *   เพื่อให้ระบบสกัดข้อความ และส่งต่อให้ AI ประเมินคะแนน พร้อมสร้างชุดคำถามสัมภาษณ์
 * - เมื่อสำเร็จ จะนำทางไปยังหน้าแสดงผลการวิเคราะห์ (/cv-result)
 */

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
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useLanguage } from "../context/language-context";
import { supabase } from "../lib/supabase";

/**
 * ฟังก์ชันทำความสะอาดข้อความ JSON จาก AI
 * ตัด markdown block (```json ... ```) และเครื่องหมายที่ไม่ถูกต้องออก เพื่อให้ JSON.parse ทำงานได้
 *
 * @param rawText ข้อความดิบที่ได้รับจาก AI
 * @returns Object ที่ parse ออกมาเป็น JavaScript Object เรียบร้อยแล้ว
 */
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

/**
 * คอมโพเนนต์หลักของหน้าอัปโหลด CV
 */
export default function UploadCV() {
  const router = useRouter();
  const { t } = useLanguage();
  const { position } = useLocalSearchParams();
  
  // State จัดการข้อมูลไฟล์ PDF และสถานะการโหลด
  const [fileName, setFileName] = useState("");
  const [fileUri, setFileUri] = useState("");
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * ฟังก์ชันเปิด File Picker เพื่อให้ผู้ใช้เลือกไฟล์ PDF
   */
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
      Alert.alert(t.upload.error, t.upload.selectFailed);
    }
  };

  /**
   * ฟังก์ชันดำเนินการอัปโหลดไฟล์ PDF ไปยังเซิร์ฟเวอร์ Backend
   * 1. ตรวจสอบการยืนยันตัวตนของผู้ใช้
   * 2. ซิงก์ข้อมูลอีเมลลงตาราง `profiles`
   * 3. ประกอบ FormData รองรับทั้ง Web (Blob/File) และ Native (file URI)
   * 4. เรียก POST /cv/upload ไปยัง Backend Express
   * 5. รับผลวิเคราะห์ JSON และส่งต่อไปยังหน้า cv-result
   */
  const uploadPDF = async () => {
    if (!fileUri) {
      Alert.alert(t.upload.required, t.upload.selectFirst);
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
        Alert.alert(t.upload.authError, t.upload.loginFirst);
        return;
      }

      // บันทึก email ลง profiles เพื่อให้ HR เห็นชื่อผู้สมัคร (ไม่ให้ขัดขวางการอัปโหลดหากติดสิทธิ์ RLS)
      if (user.email) {
        try {
          await supabase.from("profiles").upsert(
            { id: user.id, email: user.email },
            { onConflict: "id" }
          );
        } catch (profileErr) {
          console.warn("Could not upsert profile:", profileErr);
        }
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

      console.log("Submitting CV upload to http://localhost:3000/cv/upload for user:", user.id, "position:", position);

      // 3. ยิง API ไปวิเคราะห์ CV ที่ Backend
      const response = await fetch("http://localhost:3000/cv/upload", {
        method: "POST",
        body: formData,
      });

      // ดึงข้อความดิบ และแปลงเป็น JSON
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
        t.upload.uploadFailed,
        error instanceof Error
          ? error.message
          : t.upload.unable
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * ฟังก์ชันแปลงขนาดไฟล์จากหน่วย Bytes เป็น KB หรือ MB
   *
   * @param bytes ขนาดไฟล์ในหน่วยไบต์
   * @returns สตริงขนาดไฟล์พร้อมหน่วย เช่น "1.2 MB" หรือ "450.0 KB"
   */
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
        <Text style={styles.topBarTitle}>{t.upload.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View entering={FadeInDown.duration(550)} style={styles.content}>
        {/* Selected Position Header Badge */}
        {position ? (
          <View style={styles.positionBadge}>
            <MaterialCommunityIcons name="briefcase-outline" size={16} color="#2563EB" />
            <Text style={styles.positionText}>{t.upload.role}: {position}</Text>
          </View>
        ) : null}

        <Text style={styles.title}>{t.upload.submit}</Text>
        <Text style={styles.subtitle}>
          {t.upload.description}
        </Text>

        {/* Upload Dropzone Card */}
        <Animated.View entering={FadeInRight.delay(180).duration(650)} style={styles.uploadAnimatedCard}>
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
                <Text style={styles.reselectText}>{t.upload.changeFile}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.fileEmptyState}>
              <View style={styles.cloudIconBadge}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={42} color="#2563EB" />
              </View>
              <Text style={styles.dropzoneTitle}>{t.upload.chooseFile}</Text>
              <Text style={styles.dropzoneSub}>{t.upload.supports}</Text>
            </View>
          )}
        </TouchableOpacity>
        </Animated.View>

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
              <Text style={styles.actionButtonText}>{t.upload.analyzing}</Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>{t.upload.analyze}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7F9",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#111111",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(190,200,255,0.12)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.09)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: "center",
  },
  uploadAnimatedCard: {
    width: "100%",
  },
  positionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(116,214,197,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  positionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#74D6C5",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
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
    backgroundColor: "rgba(255,255,255,0.075)",
    marginBottom: 28,
  },
  dropzoneEmpty: {
    borderWidth: 2,
    borderColor: "rgba(190,200,255,0.35)",
    borderStyle: "dashed",
  },
  dropzoneSelected: {
    borderWidth: 2,
    borderColor: "#74D6C5",
    borderStyle: "solid",
    backgroundColor: "rgba(116,214,197,0.1)",
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
    color: "#111827",
    marginBottom: 4,
  },
  dropzoneSub: {
    fontSize: 13,
    color: "#6B7280",
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