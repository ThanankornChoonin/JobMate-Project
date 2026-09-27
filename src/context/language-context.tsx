/**
 * ============================================================================
 * JobMate Core - Language Context & Translations (src/context/language-context.tsx)
 * ============================================================================
 * จัดการระบบสลับสองภาษา (Thai 'th' / English 'en') ทั่วทั้งแอป:
 * 1. บันทึกและอ่านภาษาที่เลือกผ่าน AsyncStorage (Key: 'jobmate-language')
 * 2. มี Dictionary สำหรับทุกหน้าจอ (home, auth, upload, interview, cvResult, history, ฯลฯ)
 * 3. ส่งออก useLanguage hook สำหรับการเข้าถึงข้อความแปล (t) และฟังก์ชันสลับภาษา (setLanguage)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "th" | "en";

const LANGUAGE_KEY = "jobmate-language";

const translations = {
  en: {
    home: {
      welcome: "Good morning,",
      subtitle: "Your AI-powered interview workspace",
      eyebrow: "YOUR CAREER JOURNEY",
      heroTitle: "Put your best self\nforward.",
      heroSub: "Prepare your CV, complete your AI interview, and discover your strengths.",
      systemOnline: "AI ENGINE ONLINE",
      screenCandidate: "Start your application",
      livePipeline: "Your application progress",
      screened: "CV reviewed",
      matchRate: "Profile match",
      timeSaved: "Time saved",
      workspace: "Your application",
      newScreening: "Start application",
      newScreeningSub: "Upload your CV and let AI review your profile.",
      assessments: "My assessment",
      assessmentsSub: "View your scores, strengths, and feedback.",
      history: "My history",
      historySub: "Review your previous applications and interviews.",
      profile: "My profile",
      profileSub: "Manage your account.",
      focus: "AI focus",
      focusSub: "You are ready to take the next step in your career.",
    },
    auth: {
      welcome: "Welcome back",
      loginDescription: "Sign in to continue your application and view your feedback.",
      email: "EMAIL ADDRESS",
      password: "PASSWORD",
      emailPlaceholder: "you@example.com",
      passwordPlaceholder: "Enter your password",
      signIn: "Sign in",
      noAccount: "Don't have an account?",
      createOne: "Create one",
      requiredTitle: "Required Fields",
      loginRequired: "Please enter both email and password.",
      loginFailed: "Login Failed",
      error: "Error",
      unexpectedError: "An unexpected error occurred.",
      createAccount: "Create Account",
      registerDescription: "Create your candidate account with TonYourTires",
      confirmPassword: "Confirm password",
      register: "Register Account",
      alreadyAccount: "Already have an account?",
      signInLink: "Sign In",
      passwordMismatch: "Password Mismatch",
      passwordMismatchMessage: "Passwords do not match. Please try again.",
      registerFailed: "Register Failed",
      success: "Success",
      accountCreated: "Account created successfully!",
      ok: "OK",
    },
    profile: {
      title: "My Profile",
      candidateMember: "Candidate Member",
      performance: "Performance Overview",
      totalCompleted: "Total Completed",
      averageScore: "Average Score",
      highestScore: "Highest Score",
      topFocusJob: "Top Focus Job",
      logout: "Log Out Account",
      logoutTitle: "Logout",
      logoutMessage: "Are you sure you want to sign out?",
      cancel: "Cancel",
      signOut: "Sign Out",
      user: "User",
      notAvailable: "N/A",
    },
    selectPosition: {
      title: "Select Position",
      targetRole: "Target Role",
      description: "Choose the position you are applying for.",
      jobs: {
        frontend: { title: "Frontend Developer", subtitle: "React, Vue, Web Performance & UI" },
        backend: { title: "Backend Developer", subtitle: "Node.js, Databases, API Architecture" },
        fullstack: { title: "Full Stack Developer", subtitle: "End-to-End Web & System Design" },
        mobile: { title: "Mobile Developer", subtitle: "React Native, iOS, Android Apps" },
        data: { title: "Data Analyst", subtitle: "SQL, Python, Visualization & Insights" },
        ux: { title: "UX/UI Designer", subtitle: "Figma, Wireframing, User Research" },
      },
    },
    result: {
      loading: "Analyzing Interview Results...",
      title: "My Assessment",
      noAssessment: "No Assessment Found",
      noAssessmentSub: "Complete your AI interview to view your detailed score and feedback.",
      startNew: "Start New Interview",
      performanceRank: "Overall Performance Rank",
      strengths: "Key Strengths",
      improvements: "Areas to Improve",
      suggestions: "Actionable Suggestions",
      home: "Back to Home Dashboard",
      generalCandidate: "General Application",
    },
    settings: {
      title: "Settings Page",
    },
    history: {
      title: "My History & Reports",
      aiHistory: "My AI Interview History",
      viewCv: "View CV Evaluation Details",
      emptyTitle: "No History Found",
      emptySub: "You haven't uploaded a CV or completed an interview yet.",
      generalPosition: "General Position",
      aiInterview: "My AI Interview",
      cvAnalysis: "CV Analysis",
      interviewReport: "My Interview Report",
      evaluated: "Evaluated",
      statusTitle: "Application Status",
      statuses: {
        new: "Application Submitted",
        reviewing: "Under Review",
        interview: "Interview Scheduled",
        passed: "Passed Selection",
        rejected: "Not Selected",
      },
    },
    interview: {
      title: "AI Interview",
      question: "Question",
      of: "of",
      interviewer: "AI Interviewer",
      evaluating: "Evaluating your responses...",
      thinking: "Thinking...",
      placeholder: "Type your response here...",
    },
    upload: {
      title: "Upload Resume",
      role: "Role",
      submit: "Submit Your CV",
      description: "Upload your latest resume in PDF format for AI matching and skill assessment.",
      changeFile: "Change PDF File",
      chooseFile: "Choose PDF Document",
      supports: "Supports PDF up to 10MB",
      analyzing: "Analyzing Resume...",
      analyze: "Analyze Resume with AI",
      error: "Error",
      selectFailed: "Failed to select document.",
      required: "Required",
      selectFirst: "Please select a PDF document first.",
      authError: "Authentication Error",
      loginFirst: "Please login first before uploading.",
      uploadFailed: "Upload Failed",
      unable: "Unable to analyze CV. Please try again.",
    },
    cvResult: {
      title: "Candidate Evaluation",
      strengths: "Strengths",
      weaknesses: "Weaknesses",
      suggestions: "Suggestions",
      passed: "Passed",
      rejected: "Rejected",
      startInterview: "Start Interview",
      rejectedTitle: "CV Rejected",
      rejectedSub: "Your CV score is below 50. Please improve your CV before taking the interview.",
      home: "Back to Home",
    },
    historyDetail: {
      cvTitle: "My CV Evaluation",
      interviewTitle: "Interview Result",
      cvEvaluation: "CV Evaluation",
      applicationStatus: "Application Status",
      strengths: "Strengths",
      weaknesses: "Areas to Improve",
      suggestions: "Suggestions",
      interviewHistory: "My AI Interview History",
      you: "You",
      interviewer: "AI Interviewer",
      emptyChat: "No interview conversation history found",
      generalPosition: "General Position",
      evaluated: "Evaluated",
      statuses: {
        new: "Application Submitted",
        reviewing: "Under Review",
        interview: "Interview Scheduled",
        passed: "Passed Selection",
        rejected: "Not Selected",
      },
      statusDescriptions: {
        new: "Your application has been received by HR and is waiting for review.",
        reviewing: "HR is currently reviewing your resume and assessment results.",
        interview: "Congratulations! HR has scheduled an interview for you. Please await further contact.",
        passed: "Congratulations! You have passed the hiring selection process.",
        rejected: "Thank you for your interest. You were not selected for this position.",
      },
    },
  },
  th: {
    home: {
      welcome: "สวัสดีตอนเช้า,",
      subtitle: "ศูนย์ปฏิบัติการคัดกรองบุคลากร",
      eyebrow: "เส้นทางอาชีพของคุณ",
      heroTitle: "นำเสนอศักยภาพของคุณ\nให้โดดเด่น",
      heroSub: "เตรียม CV สัมภาษณ์กับ AI และค้นพบจุดแข็งของคุณ",
      systemOnline: "AI ENGINE ทำงานอยู่",
      screenCandidate: "เริ่มสมัครงาน",
      livePipeline: "ความคืบหน้าการสมัคร",
      screened: "ตรวจ CV แล้ว",
      matchRate: "ความเหมาะสมของโปรไฟล์",
      timeSaved: "เวลาที่ประหยัด",
      workspace: "การสมัครงานของคุณ",
      newScreening: "เริ่มสมัครงาน",
      newScreeningSub: "อัปโหลด CV ให้ AI ช่วยตรวจโปรไฟล์ของคุณ",
      assessments: "ผลประเมินของฉัน",
      assessmentsSub: "ดูคะแนน จุดแข็ง และคำแนะนำของคุณ",
      history: "ประวัติของฉัน",
      historySub: "ดูประวัติการสมัครและสัมภาษณ์ที่ผ่านมา",
      profile: "โปรไฟล์ของฉัน",
      profileSub: "จัดการบัญชีของคุณ",
      focus: "AI focus",
      focusSub: "คุณพร้อมก้าวต่อไปในเส้นทางอาชีพแล้ว",
    },
    auth: {
      welcome: "ยินดีต้อนรับกลับมา",
      loginDescription: "เข้าสู่ระบบเพื่อดำเนินการสมัครและดูผลประเมินของคุณ",
      email: "อีเมล",
      password: "รหัสผ่าน",
      emailPlaceholder: "you@example.com",
      passwordPlaceholder: "กรอกรหัสผ่านของคุณ",
      signIn: "เข้าสู่ระบบ",
      noAccount: "ยังไม่มีบัญชีใช่ไหม?",
      createOne: "สร้างบัญชี",
      requiredTitle: "กรุณากรอกข้อมูล",
      loginRequired: "กรุณากรอกอีเมลและรหัสผ่าน",
      loginFailed: "เข้าสู่ระบบไม่สำเร็จ",
      error: "เกิดข้อผิดพลาด",
      unexpectedError: "เกิดข้อผิดพลาดที่ไม่คาดคิด",
      createAccount: "สร้างบัญชี",
      registerDescription: "สร้างบัญชีผู้สมัครกับ TonYourTires",
      confirmPassword: "ยืนยันรหัสผ่าน",
      register: "สร้างบัญชี",
      alreadyAccount: "มีบัญชีอยู่แล้วใช่ไหม?",
      signInLink: "เข้าสู่ระบบ",
      passwordMismatch: "รหัสผ่านไม่ตรงกัน",
      passwordMismatchMessage: "รหัสผ่านไม่ตรงกัน กรุณาลองใหม่อีกครั้ง",
      registerFailed: "สร้างบัญชีไม่สำเร็จ",
      success: "สำเร็จ",
      accountCreated: "สร้างบัญชีสำเร็จแล้ว",
      ok: "ตกลง",
    },
    profile: {
      title: "โปรไฟล์ของฉัน",
      candidateMember: "สมาชิกผู้สมัครงาน",
      performance: "ภาพรวมประสิทธิภาพ",
      totalCompleted: "สัมภาษณ์เสร็จสิ้น",
      averageScore: "คะแนนเฉลี่ย",
      highestScore: "คะแนนสูงสุด",
      topFocusJob: "ตำแหน่งที่สนใจสูงสุด",
      logout: "ออกจากบัญชี",
      logoutTitle: "ออกจากระบบ",
      logoutMessage: "คุณต้องการออกจากระบบใช่หรือไม่?",
      cancel: "ยกเลิก",
      signOut: "ออกจากระบบ",
      user: "ผู้ใช้",
      notAvailable: "ไม่มีข้อมูล",
    },
    selectPosition: {
      title: "เลือกตำแหน่งงาน",
      targetRole: "ตำแหน่งเป้าหมาย",
      description: "เลือกตำแหน่งงานที่คุณต้องการสมัคร",
      jobs: {
        frontend: { title: "นักพัฒนาฟรอนต์เอนด์", subtitle: "React, Vue, ประสิทธิภาพเว็บ และ UI" },
        backend: { title: "นักพัฒนาแบ็กเอนด์", subtitle: "Node.js, ฐานข้อมูล และสถาปัตยกรรม API" },
        fullstack: { title: "นักพัฒนาฟูลสแตก", subtitle: "การออกแบบเว็บและระบบแบบครบวงจร" },
        mobile: { title: "นักพัฒนาโมบายล์", subtitle: "React Native, iOS และ Android" },
        data: { title: "นักวิเคราะห์ข้อมูล", subtitle: "SQL, Python, การแสดงผล และข้อมูลเชิงลึก" },
        ux: { title: "นักออกแบบ UX/UI", subtitle: "Figma, Wireframe และการวิจัยผู้ใช้" },
      },
    },
    result: {
      loading: "กำลังวิเคราะห์ผลการสัมภาษณ์...",
      title: "ผลประเมินของฉัน",
      noAssessment: "ไม่พบผลการประเมิน",
      noAssessmentSub: "สัมภาษณ์กับ AI ให้เสร็จเพื่อดูคะแนนและคำแนะนำของคุณ",
      startNew: "เริ่มสัมภาษณ์ใหม่",
      performanceRank: "ระดับประสิทธิภาพโดยรวม",
      strengths: "จุดแข็ง",
      improvements: "ด้านที่ควรพัฒนา",
      suggestions: "คำแนะนำที่นำไปใช้ได้",
      home: "กลับไปหน้าหลัก",
      generalCandidate: "การสมัครทั่วไป",
    },
    settings: {
      title: "หน้าการตั้งค่า",
    },
    history: {
      title: "ประวัติและรายงานของฉัน",
      aiHistory: "ประวัติการสัมภาษณ์ AI ของฉัน",
      viewCv: "ดูรายละเอียดผลการประเมิน CV",
      emptyTitle: "ไม่พบประวัติ",
      emptySub: "คุณยังไม่ได้อัปโหลด CV หรือสัมภาษณ์",
      generalPosition: "ตำแหน่งทั่วไป",
      aiInterview: "การสัมภาษณ์ AI ของฉัน",
      cvAnalysis: "วิเคราะห์ CV",
      interviewReport: "รายงานการสัมภาษณ์ของฉัน",
      evaluated: "ประเมินแล้ว",
      statusTitle: "สถานะการพิจารณา",
      statuses: {
        new: "ส่งใบสมัครแล้ว",
        reviewing: "กำลังพิจารณา",
        interview: "นัดสัมภาษณ์",
        passed: "ผ่านการคัดเลือก",
        rejected: "ไม่ผ่านการคัดเลือก",
      },
    },
    interview: {
      title: "สัมภาษณ์ด้วย AI",
      question: "คำถาม",
      of: "จาก",
      interviewer: "ผู้สัมภาษณ์ AI",
      evaluating: "กำลังประเมินคำตอบของคุณ...",
      thinking: "กำลังคิด...",
      placeholder: "พิมพ์คำตอบของคุณที่นี่...",
    },
    upload: {
      title: "อัปโหลดประวัติย่อ",
      role: "ตำแหน่ง",
      submit: "ส่ง CV ของคุณ",
      description: "อัปโหลดเรซูเม่ล่าสุดในรูปแบบ PDF เพื่อให้ AI วิเคราะห์ทักษะและความเหมาะสม",
      changeFile: "เปลี่ยนไฟล์ PDF",
      chooseFile: "เลือกเอกสาร PDF",
      supports: "รองรับ PDF ขนาดไม่เกิน 10MB",
      analyzing: "กำลังวิเคราะห์เรซูเม่...",
      analyze: "วิเคราะห์เรซูเม่ด้วย AI",
      error: "เกิดข้อผิดพลาด",
      selectFailed: "เลือกเอกสารไม่สำเร็จ",
      required: "กรุณาเลือกไฟล์",
      selectFirst: "กรุณาเลือกเอกสาร PDF ก่อน",
      authError: "ยืนยันตัวตนไม่สำเร็จ",
      loginFirst: "กรุณาเข้าสู่ระบบก่อนอัปโหลด",
      uploadFailed: "อัปโหลดไม่สำเร็จ",
      unable: "ไม่สามารถวิเคราะห์ CV ได้ กรุณาลองใหม่อีกครั้ง",
    },
    cvResult: {
      title: "ผลการประเมินผู้สมัคร",
      strengths: "จุดแข็ง",
      weaknesses: "จุดที่ควรพัฒนา",
      suggestions: "คำแนะนำ",
      passed: "ผ่าน",
      rejected: "ไม่ผ่าน",
      startInterview: "เริ่มสัมภาษณ์",
      rejectedTitle: "CV ไม่ผ่านการประเมิน",
      rejectedSub: "คะแนน CV ของคุณต่ำกว่า 50 กรุณาปรับปรุง CV ก่อนเข้าสัมภาษณ์",
      home: "กลับหน้าหลัก",
    },
    historyDetail: {
      cvTitle: "ผลประเมิน CV ของฉัน",
      interviewTitle: "ผลการสัมภาษณ์",
      cvEvaluation: "ประเมิน CV",
      applicationStatus: "สถานะการพิจารณา",
      strengths: "จุดแข็ง",
      weaknesses: "จุดที่ควรพัฒนา",
      suggestions: "คำแนะนำ",
      interviewHistory: "ประวัติการสัมภาษณ์ AI ของฉัน",
      you: "คุณ",
      interviewer: "ผู้สัมภาษณ์ AI",
      emptyChat: "ไม่พบข้อมูลประวัติบทสนทนาการสัมภาษณ์",
      generalPosition: "ตำแหน่งทั่วไป",
      evaluated: "ประเมินแล้ว",
      statuses: {
        new: "ส่งใบสมัครแล้ว",
        reviewing: "กำลังพิจารณา",
        interview: "นัดสัมภาษณ์",
        passed: "ผ่านการคัดเลือก",
        rejected: "ไม่ผ่านการคัดเลือก",
      },
      statusDescriptions: {
        new: "ส่งใบสมัครถึงทีมงาน HR เรียบร้อยแล้ว อยู่ในระหว่างรอตรวจพิจารณา",
        reviewing: "ทีมงาน HR กำลังตรวจพิจารณาประวัติและผลการประเมินของคุณ",
        interview: "ยินดีด้วย! ทีมงาน HR ได้นัดหมายสัมภาษณ์สำหรับตำแหน่งนี้แล้ว โปรดรอการติดต่อกลับ",
        passed: "ยินดีด้วย! คุณผ่านการคัดเลือกเข้าทำงานในตำแหน่งนี้",
        rejected: "ขอขอบคุณสำหรับความสนใจ ขณะนี้คุณยังไม่ผ่านการคัดเลือกสำหรับตำแหน่งนี้",
      },
    },
  },
} as const;

type Translation = (typeof translations)[Language];

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: Translation;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

/**
 * LanguageProvider Component
 * ห่อหุ้ม Root App เพื่อแชร์ State ภาษาและฟังก์ชันสลับภาษาไปยังทุกหน้าจอ
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((storedLanguage) => {
      if (storedLanguage === "th" || storedLanguage === "en") {
        setLanguageState(storedLanguage);
      }
    });
  }, []);

  /**
   * สลับภาษาและบันทึกค่าลงใน AsyncStorage อัตโนมัติ
   * @param nextLanguage - ภาษาที่ต้องการสลับ ('th' หรือ 'en')
   */
  const setLanguage = async (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t: translations[language] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * useLanguage Hook
 * ดึงค่าภาษาปัจจุบัน (language), ฟังก์ชันสลับภาษา (setLanguage), และชุดข้อความแปล (t)
 */
export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}