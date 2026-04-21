-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(50),
  employee_number VARCHAR(50),
  grade VARCHAR(10),
  class_num VARCHAR(10),
  student_number VARCHAR(50),
  child_name VARCHAR(100),
  child_grade VARCHAR(10),
  child_class VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id, role)
);

-- 학생 기록 테이블
CREATE TABLE IF NOT EXISTS student_records (
  student_id VARCHAR(100) PRIMARY KEY,
  basic_info JSON NOT NULL,
  subjects JSON NOT NULL,
  attendance JSON NOT NULL,
  notes TEXT,
  custom_fields JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- 피드백 테이블
CREATE TABLE IF NOT EXISTS feedback (
  id VARCHAR(100) PRIMARY KEY,
  student_id VARCHAR(100) NOT NULL,
  date VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  share_with_student BOOLEAN DEFAULT FALSE,
  share_with_parent BOOLEAN DEFAULT FALSE,
  teacher_id VARCHAR(100) NOT NULL,
  teacher_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES student_records(student_id) ON DELETE CASCADE
);

-- 상담 테이블
CREATE TABLE IF NOT EXISTS counseling (
  id VARCHAR(100) PRIMARY KEY,
  student_id VARCHAR(100) NOT NULL,
  date VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  next_plan TEXT,
  teacher_id VARCHAR(100) NOT NULL,
  teacher_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES student_records(student_id) ON DELETE CASCADE
);

-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  student_id VARCHAR(100),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
