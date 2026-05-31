const express    = require('express');
const pool       = require('../db');
const auth       = require('../middleware/auth');
const { processEvents } = require('../etl');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
router.use(auth);

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 교사만 분석 데이터 조회 가능
function teacherOnly(req, res, next) {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: '교사만 접근 가능합니다.' });
  next();
}

// ── GET /api/analytics/dashboard ──────────────────────────────────────
// 전체 통계 대시보드 (반별 집계 + 상위/하위 학생)
router.get('/dashboard', teacherOnly, async (req, res) => {
  try {
    const [classSummary] = await pool.query(
      `SELECT * FROM analytics_class_summary ORDER BY grade, class_num`
    );
    const [topStudents] = await pool.query(
      `SELECT student_id, student_name, grade, class_num, avg_score, attendance_rate
       FROM analytics_student_summary
       ORDER BY avg_score DESC LIMIT 5`
    );
    const [lowAttendance] = await pool.query(
      `SELECT student_id, student_name, grade, class_num, attendance_rate, absent_days
       FROM analytics_student_summary
       WHERE total_days > 0
       ORDER BY attendance_rate ASC LIMIT 5`
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM analytics_student_summary`
    );
    const [[{ etl_count }]] = await pool.query(
      `SELECT COUNT(*) AS etl_count FROM analytics_event_log WHERE processed = TRUE`
    );
    const [[{ pending_count }]] = await pool.query(
      `SELECT COUNT(*) AS pending_count FROM analytics_event_log WHERE processed = FALSE`
    );
    const [[latest]] = await pool.query(
      `SELECT MAX(last_etl_at) AS last_etl FROM analytics_student_summary`
    );

    res.json({
      classSummary,
      topStudents,
      lowAttendance,
      totalStudents: total,
      etlStats: {
        processed: etl_count,
        pending: pending_count,
        lastEtlAt: latest?.last_etl || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ── GET /api/analytics/students ───────────────────────────────────────
// 전체 학생 분석 목록
router.get('/students', teacherOnly, async (req, res) => {
  try {
    const { grade, class_num } = req.query;
    let where = '';
    const params = [];
    if (grade)     { where += ' WHERE grade = ?';              params.push(grade); }
    if (class_num) { where += (where ? ' AND' : ' WHERE') + ' class_num = ?'; params.push(class_num); }

    const [students] = await pool.query(
      `SELECT * FROM analytics_student_summary${where} ORDER BY grade, class_num, avg_score DESC`,
      params
    );
    const [subjects] = await pool.query(
      `SELECT * FROM analytics_subject_stats ORDER BY student_id, subject_name`
    );

    // 학생별로 과목 데이터 병합
    const subjectMap = {};
    for (const s of subjects) {
      if (!subjectMap[s.student_id]) subjectMap[s.student_id] = [];
      subjectMap[s.student_id].push({ name: s.subject_name, score: s.score, grade: s.grade_label });
    }
    const result = students.map(s => ({ ...s, subjects: subjectMap[s.student_id] || [] }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ── GET /api/analytics/students/:id ──────────────────────────────────
// 학생 1명 상세 분석
router.get('/students/:id', async (req, res) => {
  const { role, id: userId } = req.user;
  const { id } = req.params;
  if (role === 'student' && userId !== id) return res.status(403).json({ error: '권한 없음' });

  try {
    const [[summary]] = await pool.query(
      `SELECT * FROM analytics_student_summary WHERE student_id = ?`, [id]
    );
    const [subjects] = await pool.query(
      `SELECT subject_name AS name, score, grade_label AS grade
       FROM analytics_subject_stats WHERE student_id = ? ORDER BY score DESC`, [id]
    );
    if (!summary) return res.status(404).json({ error: '분석 데이터 없음' });
    res.json({ ...summary, subjects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ── POST /api/analytics/trigger-etl ──────────────────────────────────
// 수동 ETL 트리거 (즉시 이벤트 소비)
router.post('/trigger-etl', teacherOnly, async (req, res) => {
  try {
    await processEvents();
    res.json({ success: true, message: 'ETL 처리 완료' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ETL 처리 오류' });
  }
});

// ── POST /api/analytics/chat ──────────────────────────────────────────
// AI 챗봇: 분석 데이터 기반 학생 질의응답
router.post('/chat', teacherOnly, async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  const { student_id, message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: '질문을 입력해주세요.' });

  try {
    let contextText = '';

    if (student_id) {
      const [[summary]] = await pool.query(
        `SELECT * FROM analytics_student_summary WHERE student_id = ?`, [student_id]
      );
      const [subjects] = await pool.query(
        `SELECT subject_name, score, grade_label FROM analytics_subject_stats WHERE student_id = ? ORDER BY score DESC`,
        [student_id]
      );

      if (summary) {
        const subjectLines = subjects.map(s => `  - ${s.subject_name}: ${s.score}점 (${s.grade_label})`).join('\n');
        contextText = `
[학생 분석 데이터]
- 이름: ${summary.student_name}
- 학년/반: ${summary.grade}학년 ${summary.class_num}반
- 평균 성적: ${summary.avg_score}점
- 출석률: ${summary.attendance_rate}% (출석 ${summary.present_days}일 / 결석 ${summary.absent_days}일 / 지각 ${summary.late_days}일)
- 피드백 수: ${summary.feedback_count}건
- 상담 수: ${summary.counseling_count}건
- 과목별 성적:
${subjectLines}
`;
      }
    } else {
      const [classSummary] = await pool.query(
        `SELECT * FROM analytics_class_summary ORDER BY grade, class_num`
      );
      const lines = classSummary.map(c =>
        `  - ${c.grade}학년 ${c.class_num}반: 학생 ${c.student_count}명, 평균성적 ${c.avg_score}점, 출석률 ${c.avg_attendance_rate}%`
      ).join('\n');
      contextText = `\n[전체 반별 집계 데이터]\n${lines}\n`;
    }

    const systemPrompt = `당신은 학생 학습 현황을 분석해주는 교육 도우미입니다.
분석 DB에서 집계된 학생 데이터를 바탕으로 교사에게 도움이 되는 조언을 제공합니다.
답변은 한국어로, 간결하고 실용적으로 작성하세요.`;

    const userPrompt = contextText
      ? `다음 데이터를 참고해서 답변해주세요:\n${contextText}\n질문: ${message}`
      : message;

    const model = genai.getGenerativeModel(
      { model: 'gemini-2.5-flash-lite' },
      { apiVersion: 'v1' }
    );
    const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error('[AI Chat 오류]', err.message);
    res.status(500).json({ error: 'AI 응답 오류: ' + err.message });
  }
});

module.exports = router;
