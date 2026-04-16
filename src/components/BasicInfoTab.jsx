import React from 'react';
import s from './styles';

export default function BasicInfoTab({ info, isEditing, onChange, isMobile }) {
  const fields = [
    { key: 'name', label: '이름' }, { key: 'grade', label: '학년' },
    { key: 'classNum', label: '반' }, { key: 'studentNumber', label: '학번' },
  ];
  return (
    <div>
      <h3 style={s.sectionTitle}>기본 정보</h3>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
        {fields.map(f => (
          <div key={f.key}>
            <label style={s.label}>{f.label}</label>
            {isEditing
              ? <input value={info[f.key]} onChange={e => onChange(f.key, e.target.value)} style={s.input} />
              : <div style={s.value}>{info[f.key] || '-'}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
