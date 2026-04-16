import React from 'react';
import s from './styles';

export default function AttendanceTab({ attendance, isEditing, onChange, isMobile }) {
  const fields = [
    { key: 'present',    label: '출석', color: '#16a34a' },
    { key: 'absent',     label: '결석', color: '#dc2626' },
    { key: 'late',       label: '지각', color: '#d97706' },
    { key: 'earlyLeave', label: '조퇴', color: '#7c3aed' },
  ];
  const total = fields.reduce((a, f) => a + (attendance[f.key]||0), 0);
  const rate  = total > 0 ? ((attendance.present / total)*100).toFixed(1) : null;
  return (
    <div>
      <h3 style={s.sectionTitle}>출결 현황</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 20 }}>
        {fields.map(f => (
          <div key={f.key} style={{ background: '#f9fafb', borderRadius: 8, padding: isMobile?12:16, borderLeft: `4px solid ${f.color}` }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{f.label}</div>
            {isEditing
              ? <input type="number" min="0" value={attendance[f.key]||0} onChange={e => onChange(f.key, e.target.value)}
                  style={{ ...s.input, width: 80, fontSize: 20, padding: '4px 8px' }} />
              : <div style={{ fontSize: isMobile?24:30, fontWeight: 'bold', color: f.color }}>{attendance[f.key]||0}</div>}
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>일</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8 }}>
        <strong>총 수업일: {total}일</strong>
        {rate !== null && <span style={{ marginLeft: 16, color: '#6b7280', fontSize: 14 }}>출석률: {rate}%</span>}
      </div>
    </div>
  );
}
