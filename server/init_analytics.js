const pool = require('./db');

// 분석용 테이블 DDL (운영 DB와 같은 DB 내 별도 스키마 영역)
const ANALYTICS_TABLES = [
  // ── 이벤트 로그 (메시지 큐 역할: Kafka 대체) ──────────────────────
  `CREATE TABLE IF NOT EXISTS analytics_event_log (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type  VARCHAR(50)  NOT NULL,
    entity_id   VARCHAR(100) NOT NULL,
    payload     JSON,
    processed   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP   NULL,
    INDEX idx_processed (processed),
    INDEX idx_created   (created_at)
  )`,

  // ── 학생별 집계 요약 (분석용) ─────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS analytics_student_summary (
    student_id        VARCHAR(100) PRIMARY KEY,
    student_name      VARCHAR(100),
    grade             VARCHAR(10),
    class_num         VARCHAR(10),
    avg_score         DECIMAL(5,2)  NOT NULL DEFAULT 0,
    subject_count     INT           NOT NULL DEFAULT 0,
    total_days        INT           NOT NULL DEFAULT 0,
    present_days      INT           NOT NULL DEFAULT 0,
    absent_days       INT           NOT NULL DEFAULT 0,
    late_days         INT           NOT NULL DEFAULT 0,
    attendance_rate   DECIMAL(5,2)  NOT NULL DEFAULT 0,
    feedback_count    INT           NOT NULL DEFAULT 0,
    counseling_count  INT           NOT NULL DEFAULT 0,
    last_etl_at       TIMESTAMP     NULL,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_grade_class (grade, class_num)
  )`,

  // ── 과목별 점수 (분석용) ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS analytics_subject_stats (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    student_id   VARCHAR(100) NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    score        DECIMAL(5,2) NOT NULL DEFAULT 0,
    grade_label  VARCHAR(5)   NOT NULL DEFAULT 'F',
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_student_subject (student_id, subject_name)
  )`,

  // ── 반별 집계 (분석용) ────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS analytics_class_summary (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    grade               VARCHAR(10) NOT NULL,
    class_num           VARCHAR(10) NOT NULL,
    student_count       INT          NOT NULL DEFAULT 0,
    avg_score           DECIMAL(5,2) NOT NULL DEFAULT 0,
    avg_attendance_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_feedback      INT          NOT NULL DEFAULT 0,
    total_counseling    INT          NOT NULL DEFAULT 0,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_grade_class (grade, class_num)
  )`,
];

// MySQL 트리거 (데이터 변경 이벤트 → event_log 기록)
// 이벤트 드리븐 아키텍처: 운영 테이블 변경 시 자동으로 이벤트 발행
const TRIGGERS = [
  // 새 정규화 테이블 트리거
  {
    drop: 'DROP TRIGGER IF EXISTS trg_grades_updated',
    create: `CREATE TRIGGER trg_grades_updated
      AFTER UPDATE ON grades
      FOR EACH ROW
      INSERT INTO analytics_event_log (event_type, entity_id, payload)
      VALUES ('grades_updated', NEW.student_id,
              JSON_OBJECT('student_id', NEW.student_id))`,
  },
  {
    drop: 'DROP TRIGGER IF EXISTS trg_attendance_updated',
    create: `CREATE TRIGGER trg_attendance_updated
      AFTER UPDATE ON attendance_summary
      FOR EACH ROW
      INSERT INTO analytics_event_log (event_type, entity_id, payload)
      VALUES ('attendance_updated', NEW.student_id,
              JSON_OBJECT('student_id', NEW.student_id))`,
  },
  // 구 student_records 트리거 (하위 호환)
  {
    drop: 'DROP TRIGGER IF EXISTS trg_student_updated',
    create: `CREATE TRIGGER trg_student_updated
      AFTER UPDATE ON student_records
      FOR EACH ROW
      INSERT INTO analytics_event_log (event_type, entity_id, payload)
      VALUES ('student_updated', NEW.student_id,
              JSON_OBJECT('student_id', NEW.student_id))`,
  },
  {
    drop: 'DROP TRIGGER IF EXISTS trg_feedback_inserted',
    create: `CREATE TRIGGER trg_feedback_inserted
      AFTER INSERT ON feedback
      FOR EACH ROW
      INSERT INTO analytics_event_log (event_type, entity_id, payload)
      VALUES ('feedback_added', NEW.student_id,
              JSON_OBJECT('student_id', NEW.student_id, 'feedback_id', NEW.id))`,
  },
  {
    drop: 'DROP TRIGGER IF EXISTS trg_feedback_deleted',
    create: `CREATE TRIGGER trg_feedback_deleted
      AFTER DELETE ON feedback
      FOR EACH ROW
      INSERT INTO analytics_event_log (event_type, entity_id, payload)
      VALUES ('feedback_deleted', OLD.student_id,
              JSON_OBJECT('student_id', OLD.student_id))`,
  },
  {
    drop: 'DROP TRIGGER IF EXISTS trg_counseling_inserted',
    create: `CREATE TRIGGER trg_counseling_inserted
      AFTER INSERT ON counseling
      FOR EACH ROW
      INSERT INTO analytics_event_log (event_type, entity_id, payload)
      VALUES ('counseling_added', NEW.student_id,
              JSON_OBJECT('student_id', NEW.student_id, 'counseling_id', NEW.id))`,
  },
  {
    drop: 'DROP TRIGGER IF EXISTS trg_counseling_deleted',
    create: `CREATE TRIGGER trg_counseling_deleted
      AFTER DELETE ON counseling
      FOR EACH ROW
      INSERT INTO analytics_event_log (event_type, entity_id, payload)
      VALUES ('counseling_deleted', OLD.student_id,
              JSON_OBJECT('student_id', OLD.student_id))`,
  },
];

async function initAnalytics() {
  // 분석용 테이블 생성
  for (const ddl of ANALYTICS_TABLES) {
    await pool.query(ddl);
  }
  console.log('✅ Analytics 테이블 초기화 완료');

  // 트리거 생성 (DROP → CREATE)
  for (const { drop, create } of TRIGGERS) {
    await pool.query(drop);
    await pool.query(create);
  }
  console.log('✅ Analytics 트리거 초기화 완료 (이벤트 드리븐 구조)');
}

module.exports = { initAnalytics };
