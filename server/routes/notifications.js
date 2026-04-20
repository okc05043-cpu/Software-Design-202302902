const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// 내 알림 조회
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json(rows.map(n => ({
      id: n.id, userId: n.user_id, type: n.type, title: n.title,
      message: n.message, studentId: n.student_id, isRead: n.is_read,
      date: n.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 알림 생성
router.post('/', async (req, res) => {
  const { userId, type, title, message, studentId } = req.body;
  const id = `n_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  try {
    await pool.query(
      'INSERT INTO notifications (id, user_id, type, title, message, student_id) VALUES (?,?,?,?,?,?)',
      [id, userId, type, title, message, studentId||null]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 읽음 처리
router.patch('/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 전체 읽음
router.patch('/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE user_id=?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
