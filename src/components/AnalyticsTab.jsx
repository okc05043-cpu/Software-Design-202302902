import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api';

// ── 유틸 ──────────────────────────────────────────────────────────────
function fmt(n, digits = 1) {
  return n == null ? '-' : Number(n).toFixed(digits);
}

function ScoreBadge({ score }) {
  const s = Number(score);
  const color =
    s >= 90 ? '#16a34a' :
    s >= 75 ? '#2563eb' :
    s >= 60 ? '#d97706' : '#dc2626';
  return (
    <span style={{
      display: 'inline-block', minWidth: 40, padding: '2px 8px',
      background: color + '18', color, fontWeight: 700,
      fontSize: 12, borderLeft: `3px solid ${color}`,
    }}>
      {fmt(s)}
    </span>
  );
}

function AttendBadge({ rate }) {
  const r = Number(rate);
  const color = r >= 95 ? '#16a34a' : r >= 85 ? '#d97706' : '#dc2626';
  return (
    <span style={{ color, fontWeight: 700, fontSize: 13 }}>
      {fmt(r)}%
    </span>
  );
}

function EtlStatus({ etlStats, onTrigger, triggering }) {
  if (!etlStats) return null;
  const lastAt = etlStats.lastEtlAt
    ? new Date(etlStats.lastEtlAt).toLocaleString('ko-KR')
    : '없음';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 14px', background: '#0f1117',
      border: '1px solid #1e2235', fontSize: 12, color: '#6b7280',
    }}>
      <span>
        <span style={{ color: '#e8920a', fontFamily: 'monospace', marginRight: 6 }}>ETL</span>
        처리됨 <b style={{ color: '#d1d5db' }}>{etlStats.processed}</b>건 ·
        대기 <b style={{ color: etlStats.pending > 0 ? '#e8920a' : '#d1d5db' }}>{etlStats.pending}</b>건 ·
        최근 적재 <b style={{ color: '#d1d5db' }}>{lastAt}</b>
      </span>
      <button
        onClick={onTrigger}
        disabled={triggering}
        style={{
          marginLeft: 'auto', padding: '4px 12px',
          background: triggering ? '#1e2235' : '#e8920a',
          color: triggering ? '#6b7280' : '#07090f',
          border: 'none', cursor: triggering ? 'not-allowed' : 'pointer',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
        }}
      >
        {triggering ? '처리 중...' : '지금 적재'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
export default function AnalyticsTab({ user }) {
  const [dashboard, setDashboard] = useState(null);
  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [triggering, setTriggering] = useState(false);
  const [gradeFilter, setGradeFilter] = useState('');
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'students' | 'chat'

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dash, studs] = await Promise.all([
        api.getAnalyticsDashboard(),
        api.getAnalyticsStudents(gradeFilter ? { grade: gradeFilter } : {}),
      ]);
      setDashboard(dash);
      setStudents(studs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [gradeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleTriggerEtl = async () => {
    setTriggering(true);
    try {
      await api.triggerEtl();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setTriggering(false);
    }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>데이터 집계 중...</div>
  );
  if (error) return (
    <div style={{ padding: 20, color: '#dc2626', fontSize: 13 }}>{error}</div>
  );

  const grades = [...new Set(students.map(s => s.grade).filter(Boolean))].sort();

  return (
    <div style={{ padding: '16px 0', color: '#d1d5db', fontSize: 13 }}>

      {/* ── 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{
          fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.18em',
          color: '#e8920a', background: '#e8920a18', padding: '3px 8px',
        }}>
          OLAP
        </span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f3f4f6' }}>
          학습 현황 분석
        </h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {[
            { key: 'dashboard', label: '대시보드' },
            { key: 'students',  label: '학생 목록' },
            { key: 'chat',      label: '🤖 AI 챗봇' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                padding: '4px 12px', fontSize: 12, border: 'none', cursor: 'pointer',
                background: view === key ? '#e8920a' : '#1e2235',
                color: view === key ? '#07090f' : '#6b7280',
                fontWeight: view === key ? 700 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ETL 상태 바 ── */}
      <EtlStatus
        etlStats={dashboard?.etlStats}
        onTrigger={handleTriggerEtl}
        triggering={triggering}
      />

      <div style={{ marginTop: 16 }}>
        {view === 'dashboard' ? (
          <DashboardView dashboard={dashboard} />
        ) : view === 'students' ? (
          <StudentsView
            students={students}
            grades={grades}
            gradeFilter={gradeFilter}
            onGradeFilter={setGradeFilter}
          />
        ) : (
          <ChatBotView students={students} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 대시보드 뷰
// ─────────────────────────────────────────────────────────────────────
function DashboardView({ dashboard }) {
  if (!dashboard) return null;
  const { classSummary = [], topStudents = [], lowAttendance = [] } = dashboard;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 반별 집계 */}
      <Section title="반별 집계" label="CLASS SUMMARY">
        {classSummary.length === 0 ? (
          <Empty text="반별 데이터가 없습니다." />
        ) : (
          <Table
            cols={['학년', '반', '학생 수', '평균 성적', '평균 출석률', '피드백', '상담']}
            rows={classSummary.map(c => [
              `${c.grade}학년`,
              `${c.class_num}반`,
              `${c.student_count}명`,
              <ScoreBadge key="s" score={c.avg_score} />,
              <AttendBadge key="a" rate={c.avg_attendance_rate} />,
              c.total_feedback,
              c.total_counseling,
            ])}
          />
        )}
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 성적 상위 */}
        <Section title="성적 상위 5명" label="TOP SCORE">
          {topStudents.length === 0 ? <Empty text="데이터 없음" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topStudents.map((s, i) => (
                <div key={s.student_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px', background: '#0f1117',
                }}>
                  <span style={{ color: '#e8920a', fontFamily: 'monospace', fontSize: 11, width: 16 }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, color: '#d1d5db' }}>{s.student_name}</span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>
                    {s.grade}학년 {s.class_num}반
                  </span>
                  <ScoreBadge score={s.avg_score} />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 출석 위험 */}
        <Section title="출석률 주의 학생" label="LOW ATTENDANCE">
          {lowAttendance.length === 0 ? <Empty text="데이터 없음" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lowAttendance.map(s => (
                <div key={s.student_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px', background: '#0f1117',
                }}>
                  <span style={{ flex: 1, color: '#d1d5db' }}>{s.student_name}</span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>결석 {s.absent_days}일</span>
                  <AttendBadge rate={s.attendance_rate} />
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 학생 목록 뷰
// ─────────────────────────────────────────────────────────────────────
function StudentsView({ students, grades, gradeFilter, onGradeFilter }) {
  return (
    <div>
      {/* 학년 필터 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {['', ...grades].map(g => (
          <button
            key={g}
            onClick={() => onGradeFilter(g)}
            style={{
              padding: '4px 12px', fontSize: 12, border: 'none', cursor: 'pointer',
              background: gradeFilter === g ? '#e8920a' : '#1e2235',
              color: gradeFilter === g ? '#07090f' : '#6b7280',
            }}
          >
            {g ? `${g}학년` : '전체'}
          </button>
        ))}
      </div>

      {students.length === 0 ? (
        <Empty text="학생 분석 데이터가 없습니다. ETL 적재 후 다시 확인하세요." />
      ) : (
        <Table
          cols={['이름', '학년/반', '평균 성적', '출석률', '결석', '피드백', '상담', '과목별']}
          rows={students.map(s => [
            <b key="n" style={{ color: '#f3f4f6' }}>{s.student_name}</b>,
            `${s.grade}학년 ${s.class_num}반`,
            <ScoreBadge key="sc" score={s.avg_score} />,
            <AttendBadge key="at" rate={s.attendance_rate} />,
            s.absent_days > 0
              ? <span key="ab" style={{ color: '#dc2626' }}>{s.absent_days}일</span>
              : <span key="ab" style={{ color: '#6b7280' }}>0일</span>,
            s.feedback_count,
            s.counseling_count,
            <SubjectMini key="sub" subjects={s.subjects || []} />,
          ])}
        />
      )}
    </div>
  );
}

function SubjectMini({ subjects }) {
  if (!subjects || subjects.length === 0) return <span style={{ color: '#6b7280' }}>-</span>;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {subjects.map(sub => (
        <span key={sub.name} style={{
          fontSize: 10, padding: '1px 5px',
          background: '#1e2235', color: '#9ca3af',
        }}>
          {sub.name} {sub.score > 0 ? sub.score : '-'}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 공통 UI
// ─────────────────────────────────────────────────────────────────────
function Section({ title, label, children }) {
  return (
    <div style={{ border: '1px solid #1e2235', background: '#0a0c14' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderBottom: '1px solid #1e2235',
      }}>
        <span style={{
          fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.18em',
          color: '#e8920a', background: '#e8920a14', padding: '2px 6px',
        }}>
          {label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db' }}>{title}</span>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function Table({ cols, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{
                padding: '6px 10px', textAlign: 'left',
                color: '#6b7280', fontWeight: 600,
                borderBottom: '1px solid #1e2235',
                fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.08em',
              }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #0f1117' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '8px 10px', color: '#9ca3af', verticalAlign: 'middle' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ padding: '20px 0', textAlign: 'center', color: '#4b5563', fontSize: 12 }}>
      {text}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// AI 챗봇 뷰
// ─────────────────────────────────────────────────────────────────────
function ChatBotView({ students }) {
  const [selectedId, setSelectedId] = useState('');
  const [input, setInput]           = useState('');
  const [messages, setMessages]     = useState([
    { role: 'ai', text: '안녕하세요! 학생 학습 현황에 대해 질문하세요.\n특정 학생을 선택하면 해당 학생 데이터를 바탕으로 답변합니다.' },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const { reply } = await api.chatWithAI(text, selectedId || null);
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: `오류: ${e.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ border: '1px solid #1e2235', background: '#0a0c14', display: 'flex', flexDirection: 'column', height: 520 }}>

      {/* 헤더 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e2235', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.18em', color: '#e8920a', background: '#e8920a14', padding: '2px 6px' }}>
          AI CHAT
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db' }}>학습 현황 AI 분석</span>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{
            marginLeft: 'auto', padding: '4px 8px', fontSize: 12,
            background: '#1e2235', color: '#d1d5db', border: '1px solid #374151',
          }}
        >
          <option value="">전체 (반별 통계 기준)</option>
          {students.map(s => (
            <option key={s.student_id} value={s.student_id}>
              {s.student_name} ({s.grade}학년 {s.class_num}반)
            </option>
          ))}
        </select>
      </div>

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '75%', padding: '8px 12px', fontSize: 13, lineHeight: 1.6,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              background: m.role === 'user' ? '#e8920a22' : '#1e2235',
              color: m.isError ? '#dc2626' : '#d1d5db',
              borderLeft: m.role === 'ai' ? '3px solid #e8920a' : 'none',
              borderRight: m.role === 'user' ? '3px solid #e8920a' : 'none',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '8px 12px', background: '#1e2235', color: '#6b7280', fontSize: 13, borderLeft: '3px solid #e8920a' }}>
              AI가 분석 중...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{ borderTop: '1px solid #1e2235', display: 'flex', gap: 0 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="질문을 입력하세요... (Enter로 전송, Shift+Enter 줄바꿈)"
          rows={2}
          style={{
            flex: 1, padding: '10px 14px', background: '#0f1117',
            color: '#d1d5db', border: 'none', resize: 'none',
            fontSize: 13, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding: '0 20px', background: loading || !input.trim() ? '#1e2235' : '#e8920a',
            color: loading || !input.trim() ? '#6b7280' : '#07090f',
            border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700,
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}
