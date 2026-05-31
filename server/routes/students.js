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
      `SELECT u.id,
              u.name,
              COALESCE(c.grade,     u.grade)          AS grade,
              COALESCE(c.class_num, u.class_num)      AS classNum,
              COALESCE(s.student_number, u.student_number) AS studentNumber,
              u.role
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN classes  c ON c.id = s.class_id
       WHERE u.role = 'student'
       ORDER BY grade, classNum, studentNumber`
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
    // ── 새 정규화 테이블에서 조회 ─────────────────────────────────
    const [[info]] = await pool.query(
      `SELECT u.name, c.grade, c.class_num AS classNum,
              s.student_number AS studentNumber, s.school_name, s.notes
       FROM users u
       JOIN students s ON s.user_id = u.id
       JOIN classes  c ON c.id = s.class_id
       WHERE u.id = ? AND u.role = 'student'`,
      [studentId]
    );

    let basicInfo, subjectsList, attendance, notes, customFieldsList, schoolName;

    if (info) {
      // 새 테이블 기반 조회
      const [subjectRows] = await pool.query(
        `SELECT sub.name, g.score
         FROM grades g
         JOIN subjects sub ON sub.id = g.subject_id
         WHERE g.student_id = ?
         ORDER BY sub.id`,
        [studentId]
      );

      const [[att]] = await pool.query(
        `SELECT present_days, absent_days, late_days, early_leave_days
         FROM attendance_summary WHERE student_id = ?`,
        [studentId]
      );

      const [cfRows] = await pool.query(
        `SELECT field_key AS id, label, value
         FROM student_custom_fields WHERE student_id = ?`,
        [studentId]
      );

      basicInfo       = { name: info.name, grade: info.grade, classNum: info.classNum, studentNumber: info.studentNumber };
      subjectsList    = subjectRows.map(r => ({ name: r.name, score: Number(r.score) }));
      attendance      = att
        ? { present: att.present_days, absent: att.absent_days, late: att.late_days, earlyLeave: att.early_leave_days }
        : { present: 0, absent: 0, late: 0, earlyLeave: 0 };
      notes           = info.notes || '';
      customFieldsList = cfRows;
      schoolName      = info.school_name;

    } else {
      // ── 구 student_records 폴백 ───────────────────────────────
      let [rows] = await pool.query('SELECT * FROM student_records WHERE student_id = ?', [studentId]);
      const [userRows2] = await pool.query('SELECT school_name FROM users WHERE id = ? AND role = ?', [studentId, 'student']);
      schoolName = userRows2[0]?.school_name || null;

      if (rows.length === 0) {
        const [userRows] = await pool.query('SELECT * FROM users WHERE id = ? AND role = ?', [studentId, 'student']);
        const u = userRows[0] || {};
        await pool.query(
          `INSERT INTO student_records (student_id, basic_info, subjects, attendance, notes, custom_fields)
           VALUES (?,?,?,?,?,?)`,
          [
            studentId,
            JSON.stringify({ name: u.name || '', grade: u.grade || '', classNum: u.class_num || '', studentNumber: u.student_number || '' }),
            JSON.stringify([
              { name: '국어', score: 0 }, { name: '영어', score: 0 }, { name: '수학', score: 0 },
              { name: '과학', score: 0 }, { name: '사회', score: 0 },
            ]),
            JSON.stringify({ present: 0, absent: 0, late: 0, earlyLeave: 0 }),
            '',
            JSON.stringify([{ id: 'health', label: '건강상태', value: '' }, { id: 'hobby', label: '특기/취미', value: '' }]),
          ]
        );
        [rows] = await pool.query('SELECT * FROM student_records WHERE student_id = ?', [studentId]);
      }

      const row        = rows[0];
      basicInfo        = typeof row.basic_info    === 'string' ? JSON.parse(row.basic_info)    : row.basic_info;
      subjectsList     = typeof row.subjects      === 'string' ? JSON.parse(row.subjects)      : row.subjects;
      attendance       = typeof row.attendance    === 'string' ? JSON.parse(row.attendance)    : row.attendance;
      notes            = row.notes;
      customFieldsList = typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields;
    }

    const [feedback]   = await pool.query('SELECT * FROM feedback   WHERE student_id = ? ORDER BY created_at', [studentId]);
    const [counseling] = await pool.query('SELECT * FROM counseling WHERE student_id = ? ORDER BY date DESC',  [studentId]);

    res.json({
      basicInfo,
      subjects:     subjectsList,
      attendance,
      notes,
      customFields: customFieldsList,
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
    // ── 학급 찾기 또는 생성 ────────────────────────────────────────
    const g  = basicInfo?.grade    || '';
    const cn = basicInfo?.classNum || '';
    let classId = null;

    if (g && cn) {
      await pool.query(`INSERT IGNORE INTO classes (grade, class_num) VALUES (?, ?)`, [g, cn]);
      const [[classRow]] = await pool.query(
        `SELECT id FROM classes WHERE grade = ? AND class_num = ?`, [g, cn]
      );
      classId = classRow?.id || null;
    }

    // ── 이름 갱신 (users 테이블) ──────────────────────────────────
    if (basicInfo?.name) {
      await pool.query(
        `UPDATE users SET name = ? WHERE id = ? AND role = 'student'`,
        [basicInfo.name, studentId]
      );
    }

    // ── 학생 프로필 갱신 ──────────────────────────────────────────
    await pool.query(
      `INSERT INTO students (user_id, class_id, student_number, notes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         class_id       = COALESCE(VALUES(class_id), class_id),
         student_number = VALUES(student_number),
         notes          = VALUES(notes)`,
      [studentId, classId, basicInfo?.studentNumber || null, notes || '']
    );

    // ── 출결 집계 갱신 ────────────────────────────────────────────
    await pool.query(
      `INSERT INTO attendance_summary (student_id, present_days, absent_days, late_days, early_leave_days)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         present_days     = VALUES(present_days),
         absent_days      = VALUES(absent_days),
         late_days        = VALUES(late_days),
         early_leave_days = VALUES(early_leave_days)`,
      [
        studentId,
        attendance?.present    || 0,
        attendance?.absent     || 0,
        attendance?.late       || 0,
        attendance?.earlyLeave || 0,
      ]
    );

    // ── 성적 갱신 ─────────────────────────────────────────────────
    if (Array.isArray(subjects)) {
      for (const sub of subjects) {
        const [[subRow]] = await pool.query(`SELECT id FROM subjects WHERE name = ?`, [sub.name]);
        if (subRow) {
          await pool.query(
            `INSERT INTO grades (student_id, subject_id, score)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE score = VALUES(score)`,
            [studentId, subRow.id, sub.score ?? 0]
          );
        }
      }
    }

    // ── 커스텀 필드 갱신 ──────────────────────────────────────────
    if (Array.isArray(customFields)) {
      for (const field of customFields) {
        await pool.query(
          `INSERT INTO student_custom_fields (student_id, field_key, label, value)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE label = VALUES(label), value = VALUES(value)`,
          [studentId, field.id, field.label, field.value || '']
        );
      }
    }

    // ── 하위 호환: student_records 동기화 ────────────────────────
    await pool.query(
      `UPDATE student_records
       SET basic_info=?, subjects=?, attendance=?, notes=?, custom_fields=?, updated_at=NOW()
       WHERE student_id=?`,
      [
        JSON.stringify(basicInfo), JSON.stringify(subjects),
        JSON.stringify(attendance), notes, JSON.stringify(customFields),
        studentId,
      ]
    );

    // ── 분석 이벤트 발행 ──────────────────────────────────────────
    await pool.query(
      `INSERT INTO analytics_event_log (event_type, entity_id, payload)
       VALUES ('student_updated', ?, ?)`,
      [studentId, JSON.stringify({ student_id: studentId })]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
