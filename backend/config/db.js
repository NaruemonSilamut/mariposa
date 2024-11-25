const { Pool } = require('pg'); // ใช้โมดูล Pool จาก pg
require('dotenv').config(); // โหลดค่าจาก .env

// สร้าง instance ของ pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

// ทดสอบการเชื่อมต่อฐานข้อมูล (เชื่อมต่อครั้งเดียวเมื่อเริ่มเซิร์ฟเวอร์)
pool.on('connect', () => {
    console.log('Connected to PostgreSQL successfully!');
});

// เมื่อเกิดข้อผิดพลาด
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1); // หยุดโปรแกรมหากการเชื่อมต่อล้มเหลว
});

// ส่งออก pool เพื่อใช้งานในไฟล์อื่น
module.exports = pool;