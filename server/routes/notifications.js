const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: 알림
 *   description: 알림 조회 및 읽음 처리
 *
 * /api/notifications:
 *   get:
 *     summary: 내 알림 조회
 *     tags: [알림]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 알림 목록 반환
 *   post:
 *     summary: 알림 생성
 *     tags: [알림]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 생성 성공
 *
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: 알림 읽음 처리
 *     tags: [알림]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 읽음 처리 성공
 *
 * /api/notifications/read-all:
 *   patch:
 *     summary: 전체 알림 읽음 처리
 *     tags: [알림]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 전체 읽음 처리 성공
 */

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
