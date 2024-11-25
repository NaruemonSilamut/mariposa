const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

// verifyAdmin Middleware
const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Not an admin' });
        }
        req.user = decoded; // เพิ่มข้อมูลผู้ใช้ใน request
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid token' });
    }
};

router.post('/admin/reject-booking', verifyAdmin, async (req, res) => {
    const { bookingId } = req.body;

    if (!bookingId) {
        return res.status(400).json({ message: 'Booking ID is required' });
    }

    try {
        const query = `
            UPDATE bookings
            SET status = 'rejected'
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [bookingId]);
        res.status(200).json({ message: 'Booking rejected', booking: result.rows[0] });
    } catch (error) {
        console.error('Error rejecting booking:', error.message);
        res.status(500).json({ message: 'Error rejecting booking' });
    }
});

router.post('/admin/confirm-booking', verifyAdmin, async (req, res) => {
    const { bookingId } = req.body;

    if (!bookingId) {
        return res.status(400).json({ message: 'Booking ID is required' });
    }

    try {
        const query = `
            UPDATE bookings
            SET status = 'confirmed'
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [bookingId]);
        res.status(200).json({ message: 'Booking confirmed', booking: result.rows[0] });
    } catch (error) {
        console.error('Error confirming booking:', error.message);
        res.status(500).json({ message: 'Error confirming booking' });
    }
});

router.get('/admin/pending-bookings', verifyAdmin, async (req, res) => {
    try {
        const query = `
            SELECT id, user_id, room, slot_time, created_at
            FROM bookings
            WHERE status = 'pending'
            ORDER BY created_at DESC;
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching pending bookings:', error.message);
        res.status(500).json({ message: 'Error fetching pending bookings' });
    }
});

router.get('/book-room/booked-slots', async (req, res) => {
    const { room } = req.query;

    try {
        const query = `
            SELECT slot_time
            FROM bookings
            WHERE room = $1;
        `;
        const result = await pool.query(query, [room]);

        if (!result.rows || result.rows.length === 0) {
            return res.status(200).json([]); // No bookings found
        }

        const bookedSlots = result.rows
        .map((row) => {
          if (typeof row.slot_time === 'string') {
            try {
              return JSON.parse(row.slot_time); // แปลง JSON
            } catch (err) {
              console.error("Invalid JSON format in slot_time:", row.slot_time);
              return []; // ถ้า JSON ไม่ถูกต้อง ให้ข้ามข้อมูลนี้
            }
          }
          return row.slot_time;
        })
        .flat(); // รวม Array
        
        res.status(200).json(bookedSlots);
    } catch (error) {
        console.error("Error fetching booked slots:", error.message);
        res.status(500).json({ message: 'Error fetching booked slots' });
    }
});


router.get('/game-room/booked-slots', async (req, res) => {
    const { room } = req.query;

    try {
        const query = `
            SELECT slot_time
            FROM game_room_bookings
            WHERE room = $1;
        `;
        const result = await pool.query(query, [room]);

        if (!result.rows || result.rows.length === 0) {
            return res.status(200).json([]); // No bookings found
        }

        const bookedSlots = result.rows
        .map((row) => {
          if (typeof row.slot_time === 'string') {
            try {
              return JSON.parse(row.slot_time); // แปลง JSON
            } catch (err) {
              console.error("Invalid JSON format in slot_time:", row.slot_time);
              return []; // ถ้า JSON ไม่ถูกต้อง ให้ข้ามข้อมูลนี้
            }
          }
          return row.slot_time;
        })
        .flat(); // รวม Array

        res.status(200).json(bookedSlots);
    } catch (error) {
        console.error("Error fetching booked slots:", error.message);
        res.status(500).json({ message: 'Error fetching booked slots' });
    }
});

router.get('/cinema-room/booked-slots', async (req, res) => {
    const { room } = req.query;

    try {
        const query = `
            SELECT slot_time
            FROM cinema_room_bookings
            WHERE room = $1;
        `;
        const result = await pool.query(query, [room]);

        if (!result.rows || result.rows.length === 0) {
            return res.status(200).json([]); // No bookings found
        }

        const bookedSlots = result.rows
  .map((row) => {
    if (typeof row.slot_time === 'string') {
      try {
        return JSON.parse(row.slot_time); // แปลง JSON
      } catch (err) {
        console.error("Invalid JSON format in slot_time:", row.slot_time);
        return []; // ถ้า JSON ไม่ถูกต้อง ให้ข้ามข้อมูลนี้
      }
    }
    return row.slot_time;
  })
  .flat(); // รวม Array

        res.status(200).json(bookedSlots);
    } catch (error) {
        console.error("Error fetching booked slots:", error.message);
        res.status(500).json({ message: 'Error fetching booked slots' });
    }
});

router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = userResult.rows[0];
  
      if (!user || user.role !== 'admin') {
        return res.status(400).json({ message: 'Invalid credentials or not an admin' });
      }
  
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.status(200).json({ token });
    } catch (error) {
      console.error('Error during admin login:', error.message);
      res.status(500).json({ message: 'Error logging in admin' });
    }
  });

// ใช้ Middleware กับ Route ที่ต้องการ
router.get('/admin/dashboard', verifyAdmin, async (req, res) => {
    try {
        const bookings = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
        res.status(200).json(bookings.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin data' });
    }
});

router.post('/cinema-room/book', async (req, res) => {
    const { userId, slots } = req.body;

    // ตรวจสอบข้อมูลที่ได้รับ
    console.log("Received Data:", req.body);

    if (!userId || !slots) {
        console.log("Missing required fields");
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const query = `
            INSERT INTO cinema_room_bookings (user_id, room, slot_time, created_at)
            VALUES ($1, $2, $3, now())
            RETURNING *;
        `;
        const result = await pool.query(query, [userId, "Cinema Room", JSON.stringify(slots)]);
        console.log("Inserted Data:", result.rows[0]);
        res.status(201).json({ booking: result.rows[0] });
    } catch (error) {
        console.error("Error booking cinema room:", error.message);
        res.status(500).json({ message: "Error booking cinema room" });
    }
});

router.post('/game-room/book', async (req, res) => {
    const { user_id, slot_time } = req.body;

    if (!user_id || !slot_time) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const query = `
            INSERT INTO game_room_bookings (user_id, slot_time)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const result = await pool.query(query, [user_id, slot_time]);
        res.status(201).json({ booking: result.rows[0] });
    } catch (error) {
        console.error('Error booking game room:', error.message);
        res.status(500).json({ message: 'Error booking game room' });
    }
});

router.post('/book-room', async (req, res) => {
    const { userId, room, slots } = req.body;
  
    if (!userId || !room || !slots || slots.length === 0) {
      console.log("Missing required fields");
      return res.status(400).json({ message: 'Missing required fields' });
    }
  
    try {
      const query = `
        INSERT INTO bookings (user_id, room, slot_time, created_at, status)
        VALUES ($1, $2, $3, now(), 'pending')
        RETURNING *;
      `;
      const result = await pool.query(query, [userId, room, JSON.stringify(slots)]);
      console.log("Inserted Data:", result.rows[0]);
      res.status(201).json({ booking: result.rows[0] });
    } catch (error) {
      console.error('Error booking the room:', error.message);
      res.status(500).json({ message: 'Error booking the room' });
    }
  });
  
router.get('/get-bookings', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    try {
        const query = `
            SELECT id, user_id, room, slot_time, created_at
            FROM (
                SELECT id, user_id, room, slot_time, created_at
                FROM bookings
                WHERE user_id = $1
                UNION ALL
                SELECT id, user_id, 'Game Room' AS room, slot_time, created_at
                FROM game_room_bookings
                WHERE user_id = $1
                UNION ALL
                SELECT id, user_id, 'Cinema Room' AS room, slot_time, created_at
                FROM cinema_room_bookings
                WHERE user_id = $1
            ) AS combined_bookings
            ORDER BY created_at DESC;
        `;
        const result = await pool.query(query, [userId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching bookings:", error.message);
        res.status(500).json({ message: "Error fetching booking history" });
    }
});

// สมัครสมาชิก
router.post('/signup', async (req, res) => {
    const { email, username, password } = req.body;

    try {
        // ตรวจสอบว่าผู้ใช้มีอยู่ในระบบแล้วหรือไม่
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // แฮชรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 10);

        // เพิ่มผู้ใช้ใหม่
        await pool.query(
            'INSERT INTO users (email, username, password) VALUES ($1, $2, $3)',
            [email, username, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error during signup:', error.message);
        res.status(500).json({ message: 'Error registering user' });
    }
});

// เข้าสู่ระบบ
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).json({ message: 'User does not exist' });
        }

        // ตรวจสอบรหัสผ่าน
        console.log('รหัสผ่านที่กรอก:', password);
        console.log('รหัสผ่านในฐานข้อมูล:', user.password);
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        console.log('ผลลัพธ์การตรวจสอบรหัสผ่าน:', isPasswordCorrect);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // สร้าง JWT Token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log('JWT Token:', token);
        res.status(200).json({ result: user, token });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ message: 'Error logging in user' });
    }
});

// Protected route
router.get('/protected-route', (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]; // ดึง Token จาก Header
    console.log('Token ใน Header:', token); // ตรวจสอบ Token ที่มาจาก Frontend
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // ตรวจสอบ Token
      console.log('Token ถูก Decode:', decoded); // ดูข้อมูลใน Token
      res.status(200).json({ message: "Token is valid", decoded });
    } catch (err) {
      console.log('Token ไม่ถูกต้อง:', err.message);
      res.status(403).json({ message: "Invalid token" });
    }
  });

module.exports = router;