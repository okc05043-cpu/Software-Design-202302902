const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: 상담
 *   description: 학생 상담 관리
 *
 * /api/counseling/{studentId}:
 *   post:
 *     summary: 상담 추가 (교사 전용)
 *     tags: [상담]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 example: "2024-04-21"
 *               content:
 *                 type: string
 *               nextPlan:
 *                 type: string
 *     responses:
 *       200:
 *         description: 상담 추가 성공
 *
 * /api/counseling/{id}:
 *   delete:
 *     summary: 상담 삭제 (교사 전용)
 *     tags: [상담]
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
 *         description: 삭제 성공
 */

// 상담 추가
router.post('/:studentId', async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: '권한이 없습니다.' });
  const { studentId } = req.params;
  const { date, content, nextPlan } = req.body;
  const id = `c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

  try {
    await pool.query(
      `INSERT INTO counseling (id, student_id, date, content, next_plan, teacher_id, teacher_name)
       VALUES (?,?,?,?,?,?,?)`,
      [id, studentId, date, content, nextPlan||'', req.user.id, req.user.name]
    );
    res.json({ id, date, content, nextPlan: nextPlan||'', teacherId: req.user.id, teacherName: req.user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 상담 삭제
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: '권한이 없습니다.' });
  try {
    await pool.query('DELETE FROM counseling WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
