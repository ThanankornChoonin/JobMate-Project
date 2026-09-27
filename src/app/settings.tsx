/**
 * ============================================================================
 * หน้าจอ: ตั้งค่าระบบและเลือกโมเดล AI (Settings Screen)
 * ============================================================================
 * ไฟล์: src/app/settings.tsx
 *
 * รายละเอียด:
 * - สลับการทำงานระหว่าง Cloud AI (OpenRouter) และ Local LLM (Ollama / LM Studio)
 * - ตั้งค่า Endpoint URL และชื่อโมเดล Local LLM
 * - มีปุ่มทดสอบการเชื่อมต่อ (Test Connection) พร้อมแสดงรายชื่อโมเดลที่ค้นพบบน Local Server
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AIEngineConfig,
  AIEngineType,
  DEFAULT_AI_CONFIG,
  getAIConfig,
  saveAIConfig,
  testLocalAIConnection,
} from "../lib/ai-config";

export default function Settings() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [engine, setEngine] = useState<AIEngineType>("cloud");
  const [localUrl, setLocalUrl] = useState(DEFAULT_AI_CONFIG.localUrl);
  const [localModel, setLocalModel] = useState(DEFAULT_AI_CONFIG.localModel);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        // ลองดึงจาก backend ก่อนเพื่อความแม่นยำ
        try {
          const res = await fetch("http://localhost:3000/cv/ai-config");
          const json = await res.json();
          if (json.success && json.data) {
            setEngine(json.data.engine || "cloud");
            setLocalUrl(json.data.localUrl || DEFAULT_AI_CONFIG.localUrl);
            setLocalModel(json.data.localModel || DEFAULT_AI_CONFIG.localModel);
            setLoading(false);
            return;
          }
        } catch {
          // ถ้า backend ไม่ตอบสนอง ใช้ AsyncStorage
        }

        const config = await getAIConfig();
        setEngine(config.engine);
        setLocalUrl(config.localUrl);
        setLocalModel(config.localModel);
      } catch (err) {
        console.error("Load AI config error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccessMsg(null);
    try {
      const configData = {
        engine,
        localUrl: localUrl.trim(),
        localModel: localModel.trim(),
      };

      // บันทึกลงเครื่องมือถือ (AsyncStorage)
      await saveAIConfig(configData);

      // ซิงก์ไปยัง Backend Server ด้วย
      try {
        await fetch("http://localhost:3000/cv/ai-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(configData),
        });
      } catch (backendErr) {
        console.warn("[Settings] Sync to backend failed (backend might be offline):", backendErr);
      }

      const activeModeText = engine === "local" ? `Local LLM (${localModel.trim()})` : "Cloud AI (OpenRouter)";
      const successText = `บันทึกการตั้งค่าเรียบร้อยแล้ว! ตอนนี้ระบบใช้งาน: ${activeModeText}`;
      setSaveSuccessMsg(successText);

      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.alert) {
          window.alert(successText);
        }
      } else {
        Alert.alert("สำเร็จ", successText);
      }
    } catch {
      const errorText = "ไม่สามารถบันทึกการตั้งค่าได้";
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.alert) {
          window.alert(errorText);
        }
      } else {
        Alert.alert("ข้อผิดพลาด", errorText);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      const res = await testLocalAIConnection(localUrl.trim());
      if (res.success) {
        setDiscoveredModels(res.models);
        setTestStatus({
          tested: true,
          success: true,
          message: `เชื่อมต่อสำเร็จ! พบ ${res.models.length} โมเดลบนเครื่อง`,
        });
      } else {
        setTestStatus({
          tested: true,
          success: false,
          message: res.error || "ไม่สามารถเชื่อมต่อได้",
        });
      }
    } catch (err: any) {
      setTestStatus({
        tested: true,
        success: false,
        message: err.message || "เกิดข้อผิดพลาดในการทดสอบ",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>ตั้งค่าระบบ AI</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Card: Engine Selection */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>เลือกโมเดลการประมวลผล AI</Text>
          <Text style={styles.sectionSubtitle}>
            เลือกใช้งาน Cloud AI ผ่าน OpenRouter หรือต่อกับ Local LLM บนเครื่องของคุณ
          </Text>

          <View style={styles.optionGroup}>
            {/* Cloud Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                engine === "cloud" && styles.optionCardActive,
              ]}
              onPress={() => setEngine("cloud")}
              activeOpacity={0.8}
            >
              <View style={styles.optionLeft}>
                <View
                  style={[
                    styles.optionIconCircle,
                    { backgroundColor: engine === "cloud" ? "#EFF6FF" : "#F1F5F9" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="cloud-check"
                    size={24}
                    color={engine === "cloud" ? "#2563EB" : "#64748B"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Cloud AI (OpenRouter)</Text>
                  <Text style={styles.optionDesc}>
                    ใช้งานโมเดลบนคลาวด์ พร้อมระบบ Auto-Fallback สลับโมเดลฟรีอัตโนมัติ
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={engine === "cloud" ? "radiobox-marked" : "radiobox-blank"}
                size={22}
                color={engine === "cloud" ? "#2563EB" : "#94A3B8"}
              />
            </TouchableOpacity>

            {/* Local LLM Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                engine === "local" && styles.optionCardActive,
              ]}
              onPress={() => setEngine("local")}
              activeOpacity={0.8}
            >
              <View style={styles.optionLeft}>
                <View
                  style={[
                    styles.optionIconCircle,
                    { backgroundColor: engine === "local" ? "#FEF2F2" : "#F1F5F9" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="laptop"
                    size={24}
                    color={engine === "local" ? "#DC2626" : "#64748B"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Local LLM (Ollama / LM Studio)</Text>
                  <Text style={styles.optionDesc}>
                    รันโมเดลภาษาบนคอมพิวเตอร์ของคุณเอง เช่น Qwen 2.5, LLaMA 3, Gemma
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={engine === "local" ? "radiobox-marked" : "radiobox-blank"}
                size={22}
                color={engine === "local" ? "#DC2626" : "#94A3B8"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card: Local LLM Configuration */}
        {engine === "local" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>การตั้งค่า Local LLM Server</Text>
            <Text style={styles.sectionSubtitle}>
              ระบุ Endpoint ของ Ollama (เช่น http://localhost:11434/v1) หรือ LM Studio (http://localhost:1234/v1)
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SERVER URL</Text>
              <TextInput
                style={styles.textInput}
                value={localUrl}
                onChangeText={setLocalUrl}
                placeholder="http://localhost:11434/v1"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MODEL NAME</Text>
              <TextInput
                style={styles.textInput}
                value={localModel}
                onChangeText={setLocalModel}
                placeholder="qwen2.5:7b หรือ llama3"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Test Connection Button */}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestConnection}
              disabled={testing}
              activeOpacity={0.8}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <MaterialCommunityIcons name="connection" size={18} color="#2563EB" />
              )}
              <Text style={styles.testBtnText}>
                {testing ? "กำลังตรวจสอบการเชื่อมต่อ..." : "ทดสอบการเชื่อมต่อ Local LLM"}
              </Text>
            </TouchableOpacity>

            {/* Test Result Status */}
            {testStatus && (
              <View
                style={[
                  styles.statusBox,
                  testStatus.success ? styles.statusSuccess : styles.statusError,
                ]}
              >
                <MaterialCommunityIcons
                  name={testStatus.success ? "check-circle" : "alert-circle"}
                  size={18}
                  color={testStatus.success ? "#16A34A" : "#DC2626"}
                />
                <Text
                  style={[
                    styles.statusText,
                    testStatus.success ? styles.statusTextSuccess : styles.statusTextError,
                  ]}
                >
                  {testStatus.message}
                </Text>
              </View>
            )}

            {/* Discovered models chips */}
            {discoveredModels.length > 0 && (
              <View style={styles.modelsContainer}>
                <Text style={styles.modelsTitle}>โมเดลที่พบในเครื่อง (คลิกเพื่อเลือก):</Text>
                <View style={styles.chipRow}>
                  {discoveredModels.map((m) => {
                    const isSelected = localModel === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.modelChip,
                          isSelected && styles.modelChipSelected,
                        ]}
                        onPress={() => {
                          setLocalModel(m);
                          setSaveSuccessMsg(null);
                        }}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <MaterialCommunityIcons name="check-circle" size={16} color="#2563EB" style={{ marginRight: 4 }} />
                        )}
                        <Text
                          style={[
                            styles.modelChipText,
                            isSelected && styles.modelChipTextSelected,
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Save Success Banner */}
        {saveSuccessMsg && (
          <View style={styles.saveSuccessBox}>
            <MaterialCommunityIcons name="check-decagram" size={22} color="#16A34A" />
            <Text style={styles.saveSuccessText}>{saveSuccessMsg}</Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.saveBtnText}>
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
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
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  optionGroup: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  optionCardActive: {
    borderColor: "#2563EB",
    backgroundColor: "#F8FAFC",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  optionDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 4,
  },
  testBtnText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 13,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  statusSuccess: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  statusError: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  statusTextSuccess: {
    color: "#166534",
  },
  statusTextError: {
    color: "#991B1B",
  },
  modelsContainer: {
    marginTop: 14,
  },
  modelsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modelChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modelChipSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  modelChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  modelChipTextSelected: {
    color: "#2563EB",
    fontWeight: "700",
  },
  saveSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  saveSuccessText: {
    color: "#15803D",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    lineHeight: 18,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});