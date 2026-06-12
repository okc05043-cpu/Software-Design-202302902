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

// ── AI 챗봇 도구 정의 ─────────────────────────────────────────────────
const aiTools = [{
  functionDeclarations: [
    {
      name: 'add_feedback',
      description: '학생에게 피드백을 추가합니다.',
      parameters: {
        type: 'object',
        properties: {
          student_id:  { type: 'string', description: '학생 ID' },
          category:    { type: 'string', description: '피드백 카테고리 (학업/행동/출결/기타)' },
          content:     { type: 'string', description: '피드백 내용' },
        },
        required: ['student_id', 'category', 'content'],
      },
    },
    {
      name: 'add_counseling',
      description: '학생 상담 기록을 추가합니다.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string', description: '학생 ID' },
          date:       { type: 'string', description: '상담 날짜 (YYYY-MM-DD)' },
          content:    { type: 'string', description: '상담 내용' },
          next_plan:  { type: 'string', description: '다음 계획' },
        },
        required: ['student_id', 'date', 'content'],
      },
    },
    {
      name: 'update_grade',
      description: '학생의 특정 과목 성적을 수정합니다.',
      parameters: {
        type: 'object',
        properties: {
          student_id:   { type: 'string', description: '학생 ID' },
          subject_name: { type: 'string', description: '과목 이름' },
          score:        { type: 'number', description: '점수 (0-100)' },
        },
        required: ['student_id', 'subject_name', 'score'],
      },
    },
    {
      name: 'update_attendance',
      description: '학생의 출결 정보를 수정합니다.',
      parameters: {
        type: 'object',
        properties: {
          student_id:  { type: 'string', description: '학생 ID' },
          present:     { type: 'number', description: '출석 일수' },
          absent:      { type: 'number', description: '결석 일수' },
          late:        { type: 'number', description: '지각 일수' },
          early_leave: { type: 'number', description: '조퇴 일수' },
        },
        required: ['student_id'],
      },
    },
  ],
}];

// ── AI 함수 실행기 ────────────────────────────────────────────────────
async function executeTool(name, args, teacher) {
  const today = new Date().toISOString().slice(0, 10);

  if (name === 'add_feedback') {
    const id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await pool.query(
      `INSERT INTO feedback (id, student_id, date, category, content, share_with_student, share_with_parent, teacher_id, teacher_name)
       VALUES (?,?,?,?,?,0,0,?,?)`,
      [id, args.student_id, today, args.category || '기타', args.content, teacher.id, teacher.name]
    );
    return `피드백 추가 완료 (${args.category}: ${args.content})`;
  }

  if (name === 'add_counseling') {
    const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await pool.query(
      `INSERT INTO counseling (id, student_id, date, content, next_plan, teacher_id, teacher_name)
       VALUES (?,?,?,?,?,?,?)`,
      [id, args.student_id, args.date || today, args.content, args.next_plan || '', teacher.id, teacher.name]
    );
    return `상담 추가 완료 (${args.date || today}: ${args.content})`;
  }

  if (name === 'update_grade') {
    const [[subRow]] = await pool.query(`SELECT id FROM subjects WHERE name = ?`, [args.subject_name]);
    if (!subRow) return `과목 "${args.subject_name}"을 찾을 수 없습니다.`;
    await pool.query(
      `INSERT INTO grades (student_id, subject_id, score) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE score = VALUES(score)`,
      [args.student_id, subRow.id, args.score]
    );
    await pool.query(
      `INSERT INTO analytics_event_log (event_type, entity_id, payload) VALUES ('student_updated', ?, ?)`,
      [args.student_id, JSON.stringify({ student_id: args.student_id })]
    );
    return `${args.subject_name} 성적 ${args.score}점으로 수정 완료`;
  }

  if (name === 'update_attendance') {
    await pool.query(
      `INSERT INTO attendance_summary (student_id, present_days, absent_days, late_days, early_leave_days)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         present_days     = COALESCE(?,present_days),
         absent_days      = COALESCE(?,absent_days),
         late_days        = COALESCE(?,late_days),
         early_leave_days = COALESCE(?,early_leave_days)`,
      [
        args.student_id,
        args.present ?? 0, args.absent ?? 0, args.late ?? 0, args.early_leave ?? 0,
        args.present ?? null, args.absent ?? null, args.late ?? null, args.early_leave ?? null,
      ]
    );
    await pool.query(
      `INSERT INTO analytics_event_log (event_type, entity_id, payload) VALUES ('student_updated', ?, ?)`,
      [args.student_id, JSON.stringify({ student_id: args.student_id })]
    );
    return `출결 수정 완료 (출석:${args.present ?? '-'} 결석:${args.absent ?? '-'} 지각:${args.late ?? '-'} 조퇴:${args.early_leave ?? '-'})`;
  }

  return '알 수 없는 도구';
}

// ── POST /api/analytics/chat ──────────────────────────────────────────
// AI 챗봇: 분석 데이터 기반 학생 질의응답 + 실행
router.post('/chat', teacherOnly, async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  const { student_id, message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: '질문을 입력해주세요.' });

  try {
    // 학생 목록 (ID 포함, AI가 이름으로 학생 특정 가능하도록)
    const [allStudents] = await pool.query(
      `SELECT s.user_id AS student_id, u.name AS student_name, c.grade, c.class_num
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE u.role = 'student'`
    );
    const studentIndex = allStudents.map(s =>
      `  ${s.student_name} (ID:${s.student_id}, ${s.grade}학년 ${s.class_num}반)`
    ).join('\n');

    let contextText = `[학생 목록]\n${studentIndex}\n`;

    if (student_id) {
      const [[summary]] = await pool.query(
        `SELECT * FROM analytics_student_summary WHERE student_id = ?`, [student_id]
      );
      const [subjects] = await pool.query(
        `SELECT subject_name, score, grade_label FROM analytics_subject_stats WHERE student_id = ? ORDER BY score DESC`,
        [student_id]
      );
      if (summary) {
        const subjectLines = subjects.map(s => `  ${s.subject_name}: ${s.score}점`).join(', ');
        contextText += `\n[선택된 학생]\n${summary.student_name} | 평균 ${summary.avg_score}점 | 출석률 ${summary.attendance_rate}% | ${subjectLines}\n`;
      }
    } else {
      const [students] = await pool.query(
        `SELECT * FROM analytics_student_summary ORDER BY grade, class_num, avg_score DESC`
      );
      const [subjectStats] = await pool.query(`SELECT * FROM analytics_subject_stats`);
      const subjectMap = {};
      for (const s of subjectStats) {
        if (!subjectMap[s.student_id]) subjectMap[s.student_id] = [];
        subjectMap[s.student_id].push(`${s.subject_name}:${s.score}`);
      }
      const lines = students.map(s => {
        const subs = (subjectMap[s.student_id] || []).join(' ');
        return `  ${s.student_name}(${s.grade}-${s.class_num}) 평균${s.avg_score}점 출석${s.attendance_rate}% ${subs}`;
      }).join('\n');
      contextText += `\n[전체 성적]\n${lines}\n`;
    }

    const systemPrompt = `당신은 교사의 학생 관리를 돕는 AI입니다.
규칙:
- 답변은 2~3문장 이내로 짧게. 불필요한 설명 금지.
- 피드백/상담 추가, 성적/출결 수정 요청이 오면 확인 없이 즉시 도구 실행.
- 도구 실행 후 "완료" 한 줄로 보고.
- 데이터가 없으면 "데이터 없음"으로 끝.
오늘 날짜: ${new Date().toISOString().slice(0, 10)}`;

    const model = genai.getGenerativeModel(
      { model: 'gemini-2.5-flash-lite', tools: aiTools, systemInstruction: systemPrompt },
      { apiVersion: 'v1beta' }
    );

    // 503 일시 과부하 시 최대 3회 재시도
    let chat, response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        chat = model.startChat();
        response = await chat.sendMessage(`${contextText}\n질문: ${message}`);
        break;
      } catch (e) {
        if (attempt === 3 || !e.message.includes('503')) throw e;
        await new Promise(r => setTimeout(r, attempt * 2000));
      }
    }
    let candidate = response.response;

    // 함수 호출 처리 루프
    while ((candidate.functionCalls?.() ?? []).length > 0) {
      const calls = candidate.functionCalls();
      const toolResults = [];
      for (const call of calls) {
        const result = await executeTool(call.name, call.args, req.user);
        toolResults.push({
          functionResponse: { name: call.name, response: { result } },
        });
      }
      response = await chat.sendMessage(toolResults);
      candidate = response.response;
    }

    res.json({ reply: candidate.text() });
  } catch (err) {
    console.error('[AI Chat 오류]', err.message);
    res.status(500).json({ error: 'AI 응답 오류: ' + err.message });
  }
});

module.exports = router;
