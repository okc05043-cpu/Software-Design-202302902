require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(cors({
  origin: ['https://software.up.railway.app', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// API 라우터
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/students',      require('./routes/students'));
app.use('/api/feedback',      require('./routes/feedback'));
app.use('/api/counseling',    require('./routes/counseling'));
app.use('/api/notifications', require('./routes/notifications'));

// 학부모 자녀 조회 (childName으로 학생 찾기)
app.get('/api/my-child', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '인증 필요' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
    if (user.role !== 'parent') return res.status(403).json({ error: '권한 없음' });
    const [parentRows] = await pool.query('SELECT child_name FROM users WHERE id=? AND role=?', [user.id, 'parent']);
    if (!parentRows[0]?.child_name) return res.json({ child: null });
    const [childRows] = await pool.query(
      "SELECT id, name, grade, class_num as classNum, student_number as studentNumber FROM users WHERE name=? AND role='student'",
      [parentRows[0].child_name]
    );
    res.json({ child: childRows[0] || null });
  } catch {
    res.status(401).json({ error: '토큰 오류' });
  }
});

// 프로덕션: React 빌드 파일 서빙
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  // DB 스키마 초기화
  try {
    const fs = require('fs');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('DB 스키마 초기화 완료');
  } catch (err) {
    console.error('DB 초기화 오류:', err.message);
  }
});
