const pool = require('./db');

const BATCH_SIZE = 50;
const ETL_INTERVAL_MS = 30_000; // 30초마다 실행

// 점수 → 등급 변환
function toGradeLabel(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ─────────────────────────────────────────────────────────────────────
// 학생 1명의 분석 데이터 갱신 (새 정규화 테이블 기반)
// ─────────────────────────────────────────────────────────────────────
async function updateStudentSummary(studentId) {
  // 새 정규화 테이블에서 조회
  const [[info]] = await pool.query(
    `SELECT u.name, c.grade, c.class_num
     FROM users u
     JOIN students s ON s.user_id = u.id
     JOIN classes  c ON c.id = s.class_id
     WHERE u.id = ? AND u.role = 'student'`,
    [studentId]
  );

  let name, grade, class_num, subjects, att;

  if (info) {
    // 새 테이블 기반
    name      = info.name;
    grade     = info.grade;
    class_num = info.class_num;

    const [gradeRows] = await pool.query(
      `SELECT sub.name, g.score
       FROM grades g
       JOIN subjects sub ON sub.id = g.subject_id
       WHERE g.student_id = ?`,
      [studentId]
    );
    subjects = gradeRows.map(r => ({ name: r.name, score: Number(r.score) }));

    const [[attRow]] = await pool.query(
      `SELECT present_days, absent_days, late_days, early_leave_days
       FROM attendance_summary WHERE student_id = ?`,
      [studentId]
    );
    att = attRow
      ? { present: attRow.present_days, absent: attRow.absent_days, late: attRow.late_days, earlyLeave: attRow.early_leave_days }
      : { present: 0, absent: 0, late: 0, earlyLeave: 0 };

  } else {
    // 구 student_records 폴백
    const [records] = await pool.query(
      `SELECT sr.subjects, sr.attendance, u.name, u.grade, u.class_num
       FROM student_records sr
       JOIN users u ON u.id = sr.student_id AND u.role = 'student'
       WHERE sr.student_id = ?`,
      [studentId]
    );
    if (records.length === 0) return;

    const row = records[0];
    name      = row.name;
    grade     = row.grade;
    class_num = row.class_num;
    subjects  = typeof row.subjects   === 'string' ? JSON.parse(row.subjects)   : row.subjects;
    const attRaw = typeof row.attendance === 'string' ? JSON.parse(row.attendance) : row.attendance;
    att = { present: attRaw.present || 0, absent: attRaw.absent || 0, late: attRaw.late || 0, earlyLeave: attRaw.earlyLeave || 0 };
  }

  // 성적 집계
  const scoredSubs = subjects.filter(s => s.score > 0);
  const avgScore   = scoredSubs.length > 0
    ? scoredSubs.reduce((sum, s) => sum + s.score, 0) / scoredSubs.length
    : 0;

  // 출결 집계
  const present    = att.present    || 0;
  const absent     = att.absent     || 0;
  const late       = att.late       || 0;
  const earlyLeave = att.earlyLeave || 0;
  const totalDays  = present + absent + late + earlyLeave;
  const attendRate = totalDays > 0 ? (present / totalDays) * 100 : 0;

  // 피드백·상담 카운트
  const [[{ fcnt }]] = await pool.query(
    'SELECT COUNT(*) AS fcnt FROM feedback WHERE student_id = ?', [studentId]
  );
  const [[{ ccnt }]] = await pool.query(
    'SELECT COUNT(*) AS ccnt FROM counseling WHERE student_id = ?', [studentId]
  );

  // analytics_student_summary UPSERT
  await pool.query(
    `INSERT INTO analytics_student_summary
       (student_id, student_name, grade, class_num,
        avg_score, subject_count,
        total_days, present_days, absent_days, late_days, attendance_rate,
        feedback_count, counseling_count, last_etl_at)
     VALUES (?,?,?,?, ?,?, ?,?,?,?,?, ?,?, NOW())
     ON DUPLICATE KEY UPDATE
       student_name     = VALUES(student_name),
       grade            = VALUES(grade),
       class_num        = VALUES(class_num),
       avg_score        = VALUES(avg_score),
       subject_count    = VALUES(subject_count),
       total_days       = VALUES(total_days),
       present_days     = VALUES(present_days),
       absent_days      = VALUES(absent_days),
       late_days        = VALUES(late_days),
       attendance_rate  = VALUES(attendance_rate),
       feedback_count   = VALUES(feedback_count),
       counseling_count = VALUES(counseling_count),
       last_etl_at      = NOW()`,
    [
      studentId, name, grade, class_num,
      avgScore.toFixed(2), subjects.length,
      totalDays, present, absent, late, attendRate.toFixed(2),
      fcnt, ccnt,
    ]
  );

  // analytics_subject_stats UPSERT
  for (const sub of subjects) {
    await pool.query(
      `INSERT INTO analytics_subject_stats (student_id, subject_name, score, grade_label)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE score = VALUES(score), grade_label = VALUES(grade_label)`,
      [studentId, sub.name, sub.score, toGradeLabel(sub.score)]
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// 반별 집계 갱신
// ─────────────────────────────────────────────────────────────────────
async function updateClassSummary() {
  await pool.query(
    `INSERT INTO analytics_class_summary
       (grade, class_num, student_count, avg_score, avg_attendance_rate,
        total_feedback, total_counseling)
     SELECT
       grade, class_num,
       COUNT(*)                      AS student_count,
       ROUND(AVG(avg_score), 2)      AS avg_score,
       ROUND(AVG(attendance_rate),2) AS avg_attendance_rate,
       SUM(feedback_count)           AS total_feedback,
       SUM(counseling_count)         AS total_counseling
     FROM analytics_student_summary
     WHERE grade IS NOT NULL AND class_num IS NOT NULL
     GROUP BY grade, class_num
     ON DUPLICATE KEY UPDATE
       student_count       = VALUES(student_count),
       avg_score           = VALUES(avg_score),
       avg_attendance_rate = VALUES(avg_attendance_rate),
       total_feedback      = VALUES(total_feedback),
       total_counseling    = VALUES(total_counseling)`
  );
}

// ─────────────────────────────────────────────────────────────────────
// 이벤트 로그 소비 (이벤트 드리븐 ETL 핵심 루프)
// ─────────────────────────────────────────────────────────────────────
async function processEvents() {
  const [events] = await pool.query(
    `SELECT * FROM analytics_event_log
     WHERE processed = FALSE
     ORDER BY id ASC
     LIMIT ?`,
    [BATCH_SIZE]
  );

  if (events.length === 0) return;

  const studentIds = [...new Set(
    events.map(e => {
      const p = typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload;
      return p?.student_id;
    }).filter(Boolean)
  )];

  for (const sid of studentIds) {
    try {
      await updateStudentSummary(sid);
    } catch (err) {
      console.error(`[ETL] 학생 ${sid} 처리 오류:`, err.message);
    }
  }

  const ids = events.map(e => e.id);
  await pool.query(
    `UPDATE analytics_event_log
     SET processed = TRUE, processed_at = NOW()
     WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids
  );

  try {
    await updateClassSummary();
  } catch (err) {
    console.error('[ETL] 반별 집계 오류:', err.message);
  }

  console.log(`[ETL] 이벤트 ${events.length}건 처리, 학생 ${studentIds.length}명 갱신`);
}

// ─────────────────────────────────────────────────────────────────────
// 전체 초기 적재 (서버 시작 시 1회 실행)
// ─────────────────────────────────────────────────────────────────────
async function fullLoad() {
  const [students] = await pool.query(
    "SELECT id FROM users WHERE role = 'student'"
  );
  for (const { id } of students) {
    try {
      await updateStudentSummary(id);
    } catch (err) {
      console.error(`[ETL 초기적재] ${id}:`, err.message);
    }
  }
  await updateClassSummary();
  console.log(`[ETL] 초기 전체 적재 완료 (${students.length}명)`);
}

// ─────────────────────────────────────────────────────────────────────
// ETL 워커 시작
// ─────────────────────────────────────────────────────────────────────
function startEtlWorker() {
  fullLoad().catch(err => console.error('[ETL 초기적재 오류]', err.message));
  setInterval(() => {
    processEvents().catch(err => console.error('[ETL 루프 오류]', err.message));
  }, ETL_INTERVAL_MS);
  console.log(`[ETL] 워커 시작 — ${ETL_INTERVAL_MS / 1000}초 간격으로 이벤트 소비`);
}

module.exports = { startEtlWorker, processEvents, fullLoad };
