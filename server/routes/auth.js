const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';


// 로그인
router.post('/login', async (req, res) => {
  const { id, password, role } = req.body;
  if (!id || !password || !role) return res.status(400).json({ error: '입력값이 부족합니다.' });

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ? AND role = ?',
      [id, role]
    );

    let user = null;

    if (rows.length > 0) {
      const dbUser = rows[0];
      const match = await bcrypt.compare(password, dbUser.password);
      if (match) user = { id: dbUser.id, name: dbUser.name, role: dbUser.role };
    } 
    
    if (!user) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 회원가입
router.post('/register', async (req, res) => {
  const { id, password, name, role, subject, employeeNumber, grade, classNum, studentNumber, childName, childGrade, childClass } = req.body;
  if (!id || !password || !name || !role) return res.status(400).json({ error: '입력값이 부족합니다.' });

  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE id = ? AND role = ?', [id, role]);
    if (exists.length > 0) return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (id, role, password, name, subject, employee_number, grade, class_num, student_number, child_name, child_grade, child_class)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, role, hashed, name, subject||null, employeeNumber||null, grade||null, classNum||null, studentNumber||null, childName||null, childGrade||null, childClass||null]
    );

    if (role === 'student') {
      await pool.query(
        `INSERT IGNORE INTO student_records (student_id, basic_info, subjects, attendance, notes, custom_fields)
         VALUES (?,?,?,?,?,?)`,
        [
          id,
          JSON.stringify({ name, grade: grade||'', classNum: classNum||'', studentNumber: studentNumber||'' }),
          JSON.stringify([
            { name:'국어', score:0 }, { name:'영어', score:0 }, { name:'수학', score:0 },
            { name:'과학', score:0 }, { name:'사회', score:0 },
          ]),
          JSON.stringify({ present:0, absent:0, late:0, earlyLeave:0 }),
          '',
          JSON.stringify([{ id:'health', label:'건강상태', value:'' }, { id:'hobby', label:'특기/취미', value:'' }]),
        ]
      );
    }

    const token = jwt.sign({ id, name, role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
