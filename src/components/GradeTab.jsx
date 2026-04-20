import React from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import s from './styles';

export default function GradeTab({ subjects, isEditing, isTeacher, onScoreChange, onNameChange, onAddSubject, onRemoveSubject, isMobile }) {
  const total = subjects.reduce((a, sub) => a + sub.score, 0);
  const avg   = subjects.length ? (total / subjects.length).toFixed(2) : 0;
  const grade = avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 60 ? 'D' : 'F';
  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ ...s.sectionTitle, marginBottom: 0 }}>성적 내역</h3>
          {isEditing && isTeacher && <button onClick={onAddSubject} style={s.addBtn}>+ 과목 추가</button>}
        </div>
        <table style={s.table}>
          <thead><tr style={{ borderBottom: '2px solid #2d3148' }}>
            <th style={s.th}>과목</th>
            <th style={{ ...s.th, textAlign: 'right' }}>점수</th>
            {isEditing && isTeacher && <th style={s.th}></th>}
          </tr></thead>
          <tbody>
            {subjects.map((sub, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #2d3148' }}>
                <td style={s.td}>
                  {isEditing && isTeacher
                    ? <input value={sub.name} onChange={e => onNameChange(idx, e.target.value)} style={{ ...s.input, width: 90, padding: '4px 8px' }} />
                    : sub.name}
                </td>
                <td style={{ ...s.td, textAlign: 'right' }}>
                  {isEditing
                    ? <input type="number" min="0" max="100" value={sub.score} onChange={e => onScoreChange(idx, e.target.value)}
                        style={{ ...s.input, width: 64, textAlign: 'right', padding: '4px 8px' }} />
                    : sub.score}
                </td>
                {isEditing && isTeacher && (
                  <td style={s.td}><button onClick={() => onRemoveSubject(idx)} style={{ ...s.cancelBtn, padding:'2px 8px', fontSize:12 }}>삭제</button></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ background: '#252836', padding: 12, borderRadius: 8, marginTop: 12, border: '1px solid #363a52' }}>
          <p style={{ margin: '4px 0', color: '#dde0f0' }}><strong>총점:</strong> {total}점</p>
          <p style={{ margin: '4px 0', color: '#dde0f0' }}><strong>평균:</strong> {avg}점</p>
          <p style={{ margin: '4px 0', color: '#dde0f0' }}><strong>등급:</strong> <span style={{ color: '#a89bf7', fontSize: 20, fontWeight: 'bold' }}>{grade}</span></p>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 260, height: 300 }}>
        <h3 style={s.sectionTitle}>역량 시각화</h3>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={subjects}>
            <PolarGrid stroke="#363a52" />
            <PolarAngleAxis dataKey="name" tick={{ fill: '#8b8fa8', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0,100]} tick={{ fill: '#8b8fa8', fontSize: 10 }} />
            <Radar name="성적" dataKey="score" stroke="#7c6af0" fill="#7c6af0" fillOpacity={0.4} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
