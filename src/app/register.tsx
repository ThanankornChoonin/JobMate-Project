/**
 * ============================================================================
 * JobMate Screen - Register Page (src/app/register.tsx)
 * ============================================================================
 * หน้าจอลงทะเบียนผู้สมัครงานใหม่ (Sign Up):
 * 1. ตรวจสอบความถูกต้องของ Email และ Password (ต้องตรงกับ Confirm Password)
 * 2. สร้างบัญชีผู้ใช้งานผ่าน Supabase Auth (signUp)
 * 3. สร้าง Record ในตาราง profiles โดยกำหนด role เริ่มต้นเป็น 'candidate'
 * 4. ตัด Session (signOut) และแจ้งเตือนให้ผู้ใช้นำทางไปล็อกอินเข้าสู่ระบบ
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useLanguage } from "../context/language-context";
import { supabase } from "../lib/supabase";

/**
 * Register Component
 */
export default function Register() {
  const router = useRouter();
  const { t } = useLanguage();

  // Local Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * ฟังก์ชันดำเนินการสมัครสมาชิก (handleRegister)
   * 1. ตรวจสอบรหัสผ่านตรงกัน
   * 2. สมัครใน Auth
   * 3. บันทึก role 'candidate' ลง profiles
   * 4. สั่ง signOut และพากลับไปหน้า Login
   */
  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t.auth.requiredTitle, t.auth.loginRequired);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t.auth.passwordMismatch, t.auth.passwordMismatchMessage);
      return;
    }

    try {
      setLoading(true);

      // 1. สมัครสมาชิกในระบบ Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        Alert.alert(t.auth.registerFailed, signUpError.message);
        return;
      }

      // 2. บันทึกข้อมูลลงตาราง profiles
      if (data?.user) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            email: email.trim(),
            role: "candidate",
          },
          {
            onConflict: "id",
          }
        );

        if (profileError) {
          console.error("Profile insert error:", profileError.message);
          Alert.alert(
            "เกิดข้อผิดพลาด",
            "ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้: " + profileError.message
          );
          return;
        }
      }

      // 3. ตัด Session ล้างสถานะ Auto Login
      await supabase.auth.signOut();

      // 4. นำทางไปหน้า Login (แยกเคส Web และ Mobile เพื่อความเสถียร)
      if (Platform.OS === "web") {
        alert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบเพื่อใช้งาน");
        router.replace("/login");
      } else {
        Alert.alert(
          "สมัครสมาชิกสำเร็จ",
          "สร้างบัญชีของคุณเรียบร้อยแล้ว กรุณาเข้าสู่ระบบเพื่อใช้งาน",
          [
            {
              text: "ตกลง",
              onPress: () => router.replace("/login"),
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert(t.auth.error, err.message || t.auth.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <LinearGradient
          colors={["#050505", "#101010", "#080808"]}
          style={styles.background}
        >
          {/* Decorative background */}
          <View style={styles.redGlowTop} />
          <View style={styles.redGlowBottom} />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ================= BRAND ================= */}
            <View style={styles.brandSection}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <MaterialCommunityIcons
                    name="tire"
                    size={40}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.logoRedLine} />
              </View>

              <Text style={styles.brandText}>
                Ton<Text style={styles.brandRed}>Your</Text>Tires
              </Text>

              <Text style={styles.brandTagline}>
                DRIVE CONFIDENT. WE'VE GOT YOU COVERED.
              </Text>

              <View style={styles.aiBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.aiBadgeText}>AI-POWERED RECRUITMENT</Text>
              </View>
            </View>

            {/* ================= HEADER ================= */}
            <View style={styles.headerSection}>
              <View style={styles.titleRow}>
                <View>
                  <Text style={styles.title}>Create account</Text>
                  <Text style={styles.subtitle}>
                    สร้างบัญชีเพื่อเริ่มต้นเส้นทาง
                  </Text>
                  <Text style={styles.subtitle}>
                    การสมัครงานกับ TonYourTires
                  </Text>
                </View>

                <View style={styles.accountIcon}>
                  <MaterialCommunityIcons
                    name="account-plus-outline"
                    size={27}
                    color="#FF3030"
                  />
                </View>
              </View>
            </View>

            {/* ================= FORM ================= */}
            <View style={styles.card}>
              {/* EMAIL */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>EMAIL</Text>

                <View style={styles.inputWrapper}>
                  <View style={styles.iconBox}>
                    <MaterialCommunityIcons
                      name="email-outline"
                      size={21}
                      color="#FF3030"
                    />
                  </View>

                  <TextInput
                    placeholder={t.auth.emailPlaceholder}
                    placeholderTextColor="#777777"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* PASSWORD */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>

                <View style={styles.inputWrapper}>
                  <View style={styles.iconBox}>
                    <MaterialCommunityIcons
                      name="lock-outline"
                      size={21}
                      color="#FF3030"
                    />
                  </View>

                  <TextInput
                    placeholder={t.auth.passwordPlaceholder}
                    placeholderTextColor="#777777"
                    style={[styles.input, { paddingRight: 48 }]}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    editable={!loading}
                  />

                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={21}
                      color="#888888"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* CONFIRM PASSWORD */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>

                <View style={styles.inputWrapper}>
                  <View style={styles.iconBox}>
                    <MaterialCommunityIcons
                      name="lock-check-outline"
                      size={21}
                      color="#FF3030"
                    />
                  </View>

                  <TextInput
                    placeholder={t.auth.confirmPassword}
                    placeholderTextColor="#777777"
                    style={[styles.input, { paddingRight: 48 }]}
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                  />

                  <View style={styles.passwordStatus}>
                    {confirmPassword.length > 0 && (
                      <MaterialCommunityIcons
                        name={
                          password === confirmPassword
                            ? "check-circle"
                            : "alert-circle"
                        }
                        size={20}
                        color={
                          password === confirmPassword ? "#36D878" : "#FF3030"
                        }
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* PASSWORD INFO */}
              <View style={styles.infoBox}>
                <MaterialCommunityIcons
                  name="shield-lock-outline"
                  size={18}
                  color="#888888"
                />
                <Text style={styles.infoText}>
                  รหัสผ่านของคุณจะถูกใช้เพื่อรักษา ความปลอดภัยของบัญชี
                </Text>
              </View>

              {/* REGISTER BUTTON */}
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  loading && styles.registerButtonDisabled,
                ]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    loading
                      ? ["#555555", "#333333"]
                      : ["#FF3030", "#D90000"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.registerGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.registerText}>{t.auth.register}</Text>
                      <View style={styles.arrowCircle}>
                        <MaterialCommunityIcons
                          name="arrow-right"
                          size={20}
                          color="#FFFFFF"
                        />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ================= RECRUITMENT FLOW ================= */}
            <View style={styles.flowSection}>
              <Text style={styles.flowTitle}>START YOUR JOURNEY</Text>

              <View style={styles.flowRow}>
                {/* STEP 1 */}
                <View style={styles.flowItem}>
                  <View style={[styles.flowIcon, styles.flowIconActive]}>
                    <MaterialCommunityIcons
                      name="account-plus-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.flowTextActive}>Account</Text>
                </View>

                <View style={styles.flowLine} />

                {/* STEP 2 */}
                <View style={styles.flowItem}>
                  <View style={styles.flowIcon}>
                    <MaterialCommunityIcons
                      name="file-upload-outline"
                      size={20}
                      color="#777777"
                    />
                  </View>
                  <Text style={styles.flowText}>Resume</Text>
                </View>

                <View style={styles.flowLine} />

                {/* STEP 3 */}
                <View style={styles.flowItem}>
                  <View style={styles.flowIcon}>
                    <MaterialCommunityIcons
                      name="robot-outline"
                      size={20}
                      color="#777777"
                    />
                  </View>
                  <Text style={styles.flowText}>AI Screening</Text>
                </View>
              </View>
            </View>

            {/* ================= LOGIN LINK ================= */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>{t.auth.alreadyAccount}</Text>
              <TouchableOpacity onPress={() => router.replace("/login")}>
                <Text style={styles.loginLink}>{t.auth.signInLink}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerBrand}>
              TonYourTires Recruitment Platform
            </Text>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  background: {
    flex: 1,
    overflow: "hidden",
  },
  redGlowTop: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: "#E00000",
    opacity: 0.08,
    top: -180,
    right: -130,
  },
  redGlowBottom: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#FF0000",
    opacity: 0.05,
    bottom: -140,
    left: -130,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingTop: 35,
    paddingBottom: 35,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  brandSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#151515",
    borderWidth: 2,
    borderColor: "#E91C1C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  logoRedLine: {
    width: 42,
    height: 3,
    backgroundColor: "#E90000",
    marginTop: 8,
    borderRadius: 3,
  },
  brandText: {
    fontSize: 31,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  brandRed: {
    color: "#EF1D1D",
  },
  brandTagline: {
    color: "#8C8C8C",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 5,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(230,20,20,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,50,50,0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 15,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#37D879",
    marginRight: 7,
  },
  aiBadgeText: {
    color: "#FF6262",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  headerSection: {
    marginBottom: 20,
    paddingHorizontal: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 7,
  },
  subtitle: {
    color: "#999999",
    fontSize: 13,
    lineHeight: 20,
  },
  accountIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(230,20,20,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,50,50,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 21,
    borderWidth: 1,
    borderColor: "#292929",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 10,
  },
  fieldContainer: {
    marginBottom: 18,
  },
  fieldLabel: {
    color: "#A8A8A8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  inputWrapper: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 15,
    paddingHorizontal: 11,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(230,20,20,0.10)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },
  input: {
    flex: 1,
    height: "100%",
    color: "#FFFFFF",
    fontSize: 15,
  },
  eyeButton: {
    padding: 7,
  },
  passwordStatus: {
    position: "absolute",
    right: 14,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B0B0B",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242424",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 19,
  },
  infoText: {
    flex: 1,
    color: "#6F6F6F",
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 8,
  },
  registerButton: {
    height: 58,
    borderRadius: 16,
    overflow: "hidden",
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  registerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.20)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  flowSection: {
    marginTop: 25,
    paddingHorizontal: 4,
  },
  flowTitle: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 14,
  },
  flowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  flowItem: {
    alignItems: "center",
  },
  flowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
  },
  flowIconActive: {
    backgroundColor: "#E00000",
    borderColor: "#FF3030",
  },
  flowText: {
    color: "#777777",
    fontSize: 9,
    marginTop: 6,
    fontWeight: "600",
  },
  flowTextActive: {
    color: "#FF3030",
    fontSize: 9,
    marginTop: 6,
    fontWeight: "700",
  },
  flowLine: {
    width: 25,
    height: 1,
    backgroundColor: "#333333",
    marginHorizontal: 6,
    marginBottom: 20,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 27,
  },
  footerText: {
    color: "#777777",
    fontSize: 13,
  },
  loginLink: {
    color: "#FF3030",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 5,
  },
  footerBrand: {
    color: "#3F3F3F",
    fontSize: 9,
    textAlign: "center",
    marginTop: 18,
    letterSpacing: 0.5,
  },
});