require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const pool = require('./config/db'); // ใช้งาน pool จากไฟล์ db.js

const app = express();

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
(async () => {
    try {
        await pool.connect();
        console.log('Database Connected');
    } catch (err) {
        console.error('Database Connection Failed:', err.message);
        process.exit(1); // ออกจากโปรแกรมหากฐานข้อมูลเชื่อมต่อไม่ได้
    }
})();

// ตั้งค่า CORS
app.use(cors({
    origin: 'http://localhost:5173', // URL ของ Frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

// Middleware
app.use(express.json());

// ใช้งาน Routes สำหรับการ Authentication
app.use('/api/auth', authRoutes);

// กำหนด PORT สำหรับรัน Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});