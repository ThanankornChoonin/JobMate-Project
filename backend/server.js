/**
 * ============================================================================
 * JobMate Backend - Main Express Server (server.js)
 * ============================================================================
 * ไฟล์เริ่มต้นของเซิร์ฟเวอร์ Backend ทำหน้าที่:
 * 1. โหลด Environment Variables จากไฟล์ backend/.env
 * 2. ตั้งค่า Middleware พื้นฐาน (CORS, Express JSON Parser)
 * 3. ลงทะเบียนและ Mount Route ต่างๆ เช่น /cv
 * 4. เริ่มต้นเปิดพอร์ตรับการเชื่อมต่อ (Default: Port 3000)
 */

const path = require("path");

// โหลดค่าตัวแปรสภาพแวดล้อม (Environment Variables) เช่น API Keys, Database URLs
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const cvRoute = require("./routes/cv");

// สร้างอินสแตนซ์ของแอป Express
const app = express();

// ==========================================
// 1. MIDDLEWARES CONFIGURATION
// ==========================================

// อนุญาตการเข้าถึงข้าม Origin (CORS) เพื่อให้แอป React Native / Expo Web เชื่อมต่อได้
app.use(cors());

// แปลงข้อมูล Request Body ในรูปแบบ JSON อัตโนมัติ
app.use(express.json());

// ==========================================
// 2. ROUTE DEFINITIONS
// ==========================================

/**
 * Health Check Endpoint
 * สำหรับทดสอบว่าเซิร์ฟเวอร์ Backend ยังทำงานเป็นปกติอยู่หรือไม่
 * GET / -> ส่งข้อความสถานะ 200 OK
 */
app.get("/", (req, res) => {
  res.send("JobMate Backend Running");
});

/**
 * CV & Interview Routes
 * จัดการฟังก์ชันวิเคราะห์ CV, สัมภาษณ์ AI, ดึงข้อมูลผู้สมัคร และอัปเดตสถานะ
 * Mount ไปที่ Path: /cv/*
 */
app.use("/cv", cvRoute);

// ==========================================
// 3. SERVER INITIALIZATION
// ==========================================

// กำหนดพอร์ตของเซิร์ฟเวอร์ (อ่านจาก .env หรือใช้ค่าเริ่มต้น 3000)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 JobMate Backend Server running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});