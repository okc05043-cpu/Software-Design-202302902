const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: 학생
 *   description: 학생 목록 및 레코드 관리
 *
 * /api/students:
 *   get:
 *     summary: 학생 목록 조회 (교사 전용)
 *     tags: [학생]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 학생 목록 반환
 *       403:
 *         description: 권한 없음
 *
 * /api/students/{studentId}/record:
 *   get:
 *     summary: 학생 레코드 조회
 *     tags: [학생]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 학생 레코드 반환
 *   put:
 *     summary: 학생 레코드 저장 (교사 전용)
 *     tags: [학생]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 저장 성공
 */

// 학생 목록 조회 (교사용)
router.get('/', async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: '권한이 없습니다.' });
  try {
    const [rows] = await pool.query(
      `SELECT id, name, grade, class_num as classNum, student_number as studentNumber, role
       FROM users WHERE role = 'student' ORDER BY grade, class_num, student_number`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 학생 레코드 조회
router.get('/:studentId/record', async (req, res) => {
  const { studentId } = req.params;
  const { role, id } = req.user;

  if (role === 'student' && id !== studentId) return res.status(403).json({ error: '권한이 없습니다.' });

  try {
    let [rows] = await pool.query('SELECT * FROM student_records WHERE student_id = ?', [studentId]);
    const [userRows2] = await pool.query('SELECT school_name FROM users WHERE id = ? AND role = ?', [studentId, 'student']);
    const schoolName = userRows2[0]?.school_name || null;

    if (rows.length === 0) {
      const [userRows] = await pool.query('SELECT * FROM users WHERE id = ? AND role = ?', [studentId, 'student']);
      const info = userRows[0] || {};
      await pool.query(
        `INSERT INTO student_records (student_id, basic_info, subjects, attendance, notes, custom_fields)
         VALUES (?,?,?,?,?,?)`,
        [
          studentId,
          JSON.stringify({ name: info.name||'', grade: info.grade||'', classNum: info.class_num||'', studentNumber: info.student_number||'' }),
          JSON.stringify([
            { name:'국어', score:0 }, { name:'영어', score:0 }, { name:'수학', score:0 },
            { name:'과학', score:0 }, { name:'사회', score:0 },
          ]),
          JSON.stringify({ present:0, absent:0, late:0, earlyLeave:0 }),
          '',
          JSON.stringify([{ id:'health', label:'건강상태', value:'' }, { id:'hobby', label:'특기/취미', value:'' }]),
        ]
      );
      [rows] = await pool.query('SELECT * FROM student_records WHERE student_id = ?', [studentId]);
    }

    const row = rows[0];
    const [feedback] = await pool.query('SELECT * FROM feedback WHERE student_id = ? ORDER BY created_at', [studentId]);
    const [counseling] = await pool.query('SELECT * FROM counseling WHERE student_id = ? ORDER BY date DESC', [studentId]);

    res.json({
      basicInfo: typeof row.basic_info === 'string' ? JSON.parse(row.basic_info) : row.basic_info,
      subjects: typeof row.subjects === 'string' ? JSON.parse(row.subjects) : row.subjects,
      attendance: typeof row.attendance === 'string' ? JSON.parse(row.attendance) : row.attendance,
      notes: row.notes,
      customFields: typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields,
      schoolName,
      feedback: feedback.map(f => ({
        id: f.id, date: f.date, category: f.category, content: f.content,
        shareWithStudent: f.share_with_student, shareWithParent: f.share_with_parent,
        teacherId: f.teacher_id, teacherName: f.teacher_name,
      })),
      counseling: counseling.map(c => ({
        id: c.id, date: c.date, content: c.content, nextPlan: c.next_plan,
        teacherId: c.teacher_id, teacherName: c.teacher_name, createdAt: c.created_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 학생 레코드 저장
router.put('/:studentId/record', async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: '권한이 없습니다.' });
  const { studentId } = req.params;
  const { basicInfo, subjects, attendance, notes, customFields } = req.body;

  try {
    await pool.query(
      `UPDATE student_records SET basic_info=?, subjects=?, attendance=?, notes=?, custom_fields=?, updated_at=NOW()
       WHERE student_id=?`,
      [JSON.stringify(basicInfo), JSON.stringify(subjects), JSON.stringify(attendance), notes, JSON.stringify(customFields), studentId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
