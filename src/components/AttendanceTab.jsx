import React from 'react';
import s from './styles';

export default function AttendanceTab({ attendance, isEditing, onChange, isMobile }) {
  const fields = [
    { key: 'present',    label: '출석', color: '#22c55e' },
    { key: 'absent',     label: '결석', color: '#f87171' },
    { key: 'late',       label: '지각', color: '#fbbf24' },
    { key: 'earlyLeave', label: '조퇴', color: '#a78bfa' },
  ];
  const total = fields.reduce((a, f) => a + (attendance[f.key]||0), 0);
  const rate  = total > 0 ? ((attendance.present / total)*100).toFixed(1) : null;
  return (
    <div>
      <h3 style={s.sectionTitle}>출결 현황</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 20 }}>
        {fields.map(f => (
          <div key={f.key} style={{ background: '#252836', borderRadius: 8, padding: isMobile?12:16, borderLeft: `4px solid ${f.color}`, border: '1px solid #363a52', borderLeftWidth: 4, borderLeftColor: f.color }}>
            <div style={{ fontSize: 13, color: '#8b8fa8', marginBottom: 4 }}>{f.label}</div>
            {isEditing
              ? <input type="number" min="0" value={attendance[f.key]||0} onChange={e => onChange(f.key, e.target.value)}
                  style={{ ...s.input, width: 80, fontSize: 20, padding: '4px 8px' }} />
              : <div style={{ fontSize: isMobile?24:30, fontWeight: 'bold', color: f.color }}>{attendance[f.key]||0}</div>}
            <div style={{ fontSize: 12, color: '#8b8fa8', marginTop: 2 }}>일</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#1e1b3a', padding: 12, borderRadius: 8, border: '1px solid #4a3f8a' }}>
        <strong style={{ color: '#dde0f0' }}>총 수업일: {total}일</strong>
        {rate !== null && <span style={{ marginLeft: 16, color: '#a89bf7', fontSize: 14 }}>출석률: {rate}%</span>}
      </div>
    </div>
  );
}
