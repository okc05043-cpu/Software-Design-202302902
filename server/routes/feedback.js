const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// 피드백 추가
router.post('/:studentId', async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: '권한이 없습니다.' });
  const { studentId } = req.params;
  const { category, content, shareWithStudent, shareWithParent } = req.body;
  const id = `f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  const date = new Date().toISOString().slice(0,10);

  try {
    await pool.query(
      `INSERT INTO feedback (id, student_id, date, category, content, share_with_student, share_with_parent, teacher_id, teacher_name)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, studentId, date, category, content, shareWithStudent, shareWithParent, req.user.id, req.user.name]
    );
    res.json({ id, date, category, content, shareWithStudent, shareWithParent, teacherId: req.user.id, teacherName: req.user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 피드백 공개 설정 변경
router.patch('/:id', async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: '권한이 없습니다.' });
  const { field, value } = req.body;
  const col = field === 'shareWithStudent' ? 'share_with_student' : 'share_with_parent';
  try {
    await pool.query(`UPDATE feedback SET ${col}=? WHERE id=?`, [value, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 피드백 삭제
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: '권한이 없습니다.' });
  try {
    await pool.query('DELETE FROM feedback WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
