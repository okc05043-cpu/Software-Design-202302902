-- ================================================================
-- 운영용 스키마 (Operational Schema)
-- ================================================================

-- ── 1. 사용자 (공통) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           VARCHAR(100) NOT NULL,
  role         VARCHAR(20)  NOT NULL,
  password     VARCHAR(255) NOT NULL,
  name         VARCHAR(100) NOT NULL,
  created_at   TIMESTAMP    DEFAULT NOW(),
  PRIMARY KEY (id, role)
);

-- ── 2. 학급 ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  grade     VARCHAR(10) NOT NULL,
  class_num VARCHAR(10) NOT NULL,
  UNIQUE KEY uk_class (grade, class_num)
);

-- ── 3. 교사 프로필 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  user_id         VARCHAR(100) PRIMARY KEY,
  subject         VARCHAR(50),
  employee_number VARCHAR(50),
  school_name     VARCHAR(200),
  school_type     VARCHAR(20)
);

-- ── 4. 학부모 프로필 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parents (
  user_id     VARCHAR(100) PRIMARY KEY,
  child_name  VARCHAR(100),
  child_grade VARCHAR(10),
  child_class VARCHAR(10)
);

-- ── 5. 학생 프로필 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  user_id        VARCHAR(100) PRIMARY KEY,
  class_id       INT,
  student_number VARCHAR(50),
  school_name    VARCHAR(200),
  notes          TEXT,
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- ── 6. 과목 ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- ── 7. 성적 ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grades (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(100) NOT NULL,
  subject_id INT          NOT NULL,
  score      DECIMAL(5,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_student_subject (student_id, subject_id),
  FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- ── 8. 출결 집계 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_summary (
  student_id       VARCHAR(100) PRIMARY KEY,
  present_days     INT NOT NULL DEFAULT 0,
  absent_days      INT NOT NULL DEFAULT 0,
  late_days        INT NOT NULL DEFAULT 0,
  early_leave_days INT NOT NULL DEFAULT 0,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE CASCADE
);

-- ── 9. 개별 출결 기록 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  student_id  VARCHAR(100) NOT NULL,
  record_date DATE         NOT NULL,
  status      ENUM('present','absent','late','early_leave') NOT NULL,
  UNIQUE KEY uk_student_date (student_id, record_date),
  FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE CASCADE
);

-- ── 10. 학생 커스텀 필드 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_custom_fields (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(100) NOT NULL,
  field_key  VARCHAR(50)  NOT NULL,
  label      VARCHAR(100) NOT NULL,
  value      TEXT,
  UNIQUE KEY uk_student_field (student_id, field_key),
  FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE CASCADE
);

-- ── 11. 피드백 ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id                 VARCHAR(100) PRIMARY KEY,
  student_id         VARCHAR(100) NOT NULL,
  teacher_id         VARCHAR(100) NOT NULL,
  teacher_name       VARCHAR(100) NOT NULL,
  date               VARCHAR(20)  NOT NULL,
  category           VARCHAR(50)  NOT NULL,
  content            TEXT         NOT NULL,
  share_with_student BOOLEAN      DEFAULT FALSE,
  share_with_parent  BOOLEAN      DEFAULT FALSE,
  created_at         TIMESTAMP    DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE CASCADE
);

-- ── 12. 상담 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS counseling (
  id           VARCHAR(100) PRIMARY KEY,
  student_id   VARCHAR(100) NOT NULL,
  teacher_id   VARCHAR(100) NOT NULL,
  teacher_name VARCHAR(100) NOT NULL,
  date         VARCHAR(20)  NOT NULL,
  content      TEXT         NOT NULL,
  next_plan    TEXT,
  created_at   TIMESTAMP    DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE CASCADE
);

-- ── 13. 알림 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         VARCHAR(100) PRIMARY KEY,
  user_id    VARCHAR(100) NOT NULL,
  type       VARCHAR(50)  NOT NULL,
  title      VARCHAR(200) NOT NULL,
  message    TEXT         NOT NULL,
  student_id VARCHAR(100),
  is_read    BOOLEAN      DEFAULT FALSE,
  created_at TIMESTAMP    DEFAULT NOW()
);

-- ── 하위 호환: 기존 student_records 테이블 유지 ──────────────────
CREATE TABLE IF NOT EXISTS student_records (
  student_id    VARCHAR(100) PRIMARY KEY,
  basic_info    JSON NOT NULL,
  subjects      JSON NOT NULL,
  attendance    JSON NOT NULL,
  notes         TEXT,
  custom_fields JSON NOT NULL,
  updated_at    TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- ================================================================
-- 기본 시드 데이터
-- ================================================================

-- 기본 과목
INSERT IGNORE INTO subjects (name) VALUES ('국어'), ('영어'), ('수학'), ('과학'), ('사회');

-- 기본 학급 (1학년 1반)
INSERT IGNORE INTO classes (id, grade, class_num) VALUES (1, '1', '1');

-- 기본 사용자 (student01)
INSERT IGNORE INTO users (id, role, password, name)
VALUES ('student01', 'student', '$2a$10$CwTycUXWue0Thq9StjUM0uIMPJOWwXHHi3NvAQNYGPMbaHkubxHWy', '이학생');

-- 학생 프로필
INSERT IGNORE INTO students (user_id, class_id, student_number)
VALUES ('student01', 1, '20241001');

-- 출결 집계
INSERT IGNORE INTO attendance_summary (student_id) VALUES ('student01');

-- 성적 (기본 0점)
INSERT IGNORE INTO grades (student_id, subject_id, score)
SELECT 'student01', id, 0 FROM subjects;

-- 커스텀 필드
INSERT IGNORE INTO student_custom_fields (student_id, field_key, label, value) VALUES
('student01', 'health', '건강상태', ''),
('student01', 'hobby',  '특기/취미', '');

-- student_records 하위 호환 시드
INSERT IGNORE INTO student_records (student_id, basic_info, subjects, attendance, notes, custom_fields)
VALUES (
  'student01',
  '{"name":"이학생","grade":"1","classNum":"1","studentNumber":"20241001"}',
  '[{"name":"국어","score":0},{"name":"영어","score":0},{"name":"수학","score":0},{"name":"과학","score":0},{"name":"사회","score":0}]',
  '{"present":0,"absent":0,"late":0,"earlyLeave":0}',
  '',
  '[{"id":"health","label":"건강상태","value":""},{"id":"hobby","label":"특기/취미","value":""}]'
);
