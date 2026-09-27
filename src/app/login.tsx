/**
 * ============================================================================
 * JobMate Screen - Login Page (src/app/login.tsx)
 * ============================================================================
 * หน้าจอเข้าสู่ระบบ (Sign In) สำหรับผู้สมัครและเจ้าหน้าที่ฝ่ายบุคคล (HR):
 * 1. รับ Email และ Password ผ่าน Form Validation
 * 2. ตรวจสอบสิทธิ์ผ่าน Supabase Auth (signInWithPassword)
 * 3. ตรวจสอบบทบาท (Role) ของผู้ใช้จากตาราง profiles
 * 4. แยกการนำทางอัตโนมัติ:
 *    - Role 'hr' หรือ 'admin' -> นำทางไป /hr-dashboard
 *    - Role 'candidate' -> นำทางไป /home
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
 * Login Component
 */
export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();

  // Local Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * ฟังก์ชันดำเนินการเข้าสู่ระบบ (handleLogin)
   * 1. ตรวจสอบความครบถ้วนของข้อมูล
   * 2. ยิง Supabase signInWithPassword
   * 3. ซิงค์อีเมลลง profiles ป้องกันกรณี profiles ยังไม่มีข้อมูล
   * 4. ดึง role และนำทางไปยังหน้าที่เหมาะสม
   */
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t.auth.requiredTitle, t.auth.loginRequired);
      return;
    }

    try {
      setLoading(true);

      // 1. ตรวจสอบอีเมลและรหัสผ่านกับระบบ Auth เท่านั้น
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // ถ้าล็อกอินไม่ผ่าน (รหัสผิด หรือยังไม่ได้สมัครสมาชิก) ให้ปฏิเสธทันที
      if (error) {
        Alert.alert(
          t.auth.loginFailed,
          "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้สมัครสมาชิก"
        );
        return;
      }

      // 2. ถ้าล็อกอินผ่าน ดึง Role จากตาราง profiles มาตรวจสอบ
      if (data?.session?.user) {
        const userId = data.session.user.id;

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("Fetch profile role error:", profileError.message);
        }

        const role = profileData?.role || "candidate";

        // 3. แยกการนำทางตาม Role
        if (role === "hr" || role === "admin") {
          router.replace("/hr-dashboard" as any);
        } else {
          router.replace("/home" as any);
        }
      }
    } catch (err: any) {
      Alert.alert(
        t.auth.error,
        err.message || t.auth.unexpectedError
      );
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
          {/* Decorative circles */}
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
                    size={42}
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
                <Text style={styles.aiBadgeText}>
                  AI-POWERED RECRUITMENT
                </Text>
              </View>
            </View>

            {/* ================= WELCOME ================= */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>
                Welcome back
              </Text>

              <Text style={styles.welcomeSubtitle}>
                เข้าสู่ระบบเพื่อเริ่มต้นเส้นทาง{"\n"}
                การสมัครงานกับ TonYourTires
              </Text>
            </View>

            {/* ================= LOGIN CARD ================= */}
            <View style={styles.card}>
              {/* Email */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  EMAIL / USERNAME
                </Text>

                <View style={styles.inputWrapper}>
                  <View style={styles.iconBox}>
                    <MaterialCommunityIcons
                      name="email-outline"
                      size={21}
                      color="#FF2A2A"
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

              {/* Password */}
              <View style={styles.fieldContainer}>
                <View style={styles.passwordHeader}>
                  <Text style={styles.fieldLabel}>
                    PASSWORD
                  </Text>

                  <TouchableOpacity>
                    <Text style={styles.forgotText}>
                      ลืมรหัสผ่าน?
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <View style={styles.iconBox}>
                    <MaterialCommunityIcons
                      name="lock-outline"
                      size={21}
                      color="#FF2A2A"
                    />
                  </View>

                  <TextInput
                    placeholder={t.auth.passwordPlaceholder}
                    placeholderTextColor="#777777"
                    style={[
                      styles.input,
                      {
                        paddingRight: 45,
                      },
                    ]}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    editable={!loading}
                  />

                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    <MaterialCommunityIcons
                      name={
                        showPassword
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={21}
                      color="#888888"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ================= LOGIN BUTTON ================= */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
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
                  style={styles.loginGradient}
                >
                  {loading ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                      size="small"
                    />
                  ) : (
                    <>
                      <Text style={styles.loginText}>
                        {t.auth.signIn}
                      </Text>

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

              {/* ================= DIVIDER ================= */}
              <View style={styles.dividerRow}>
                <View style={styles.divider} />

                <Text style={styles.dividerText}>
                  SECURE LOGIN
                </Text>

                <View style={styles.divider} />
              </View>

              {/* Security */}
              <View style={styles.securityRow}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={17}
                  color="#42D87A"
                />

                <Text style={styles.securityText}>
                  Your account is protected
                </Text>
              </View>
            </View>

            {/* ================= AI FLOW ================= */}
            <View style={styles.flowSection}>
              <Text style={styles.flowTitle}>
                YOUR RECRUITMENT JOURNEY
              </Text>

              <View style={styles.flowRow}>
                <View style={styles.flowItem}>
                  <View style={styles.flowIcon}>
                    <MaterialCommunityIcons
                      name="file-account-outline"
                      size={21}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text style={styles.flowText}>
                    Resume
                  </Text>
                </View>

                <View style={styles.flowLine} />

                <View style={styles.flowItem}>
                  <View style={styles.flowIcon}>
                    <MaterialCommunityIcons
                      name="robot-outline"
                      size={21}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text style={styles.flowText}>
                    AI Screening
                  </Text>
                </View>

                <View style={styles.flowLine} />

                <View style={styles.flowItem}>
                  <View style={styles.flowIcon}>
                    <MaterialCommunityIcons
                      name="message-processing-outline"
                      size={21}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text style={styles.flowText}>
                    AI Interview
                  </Text>
                </View>
              </View>
            </View>

            {/* ================= REGISTER ================= */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>
                {t.auth.noAccount}
              </Text>

              <TouchableOpacity
                onPress={() => router.push("/register")}
              >
                <Text style={styles.registerLink}>
                  {t.auth.createOne}
                </Text>
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
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(230,0,0,0.10)",
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
  welcomeSection: {
    marginBottom: 20,
    paddingHorizontal: 3,
  },
  welcomeTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 7,
  },
  welcomeSubtitle: {
    color: "#999999",
    fontSize: 14,
    lineHeight: 21,
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
  passwordHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  forgotText: {
    color: "#E83232",
    fontSize: 11,
    fontWeight: "700",
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
  loginButton: {
    height: 58,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 2,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loginText: {
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#292929",
  },
  dividerText: {
    color: "#555555",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginHorizontal: 12,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  securityText: {
    color: "#666666",
    fontSize: 11,
    marginLeft: 6,
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
  flowText: {
    color: "#777777",
    fontSize: 9,
    marginTop: 6,
    fontWeight: "600",
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
  registerLink: {
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