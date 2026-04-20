import React from 'react';
import s from './styles';

export default function NotesTab({ notes, customFields, isEditing, isTeacher, onNotesChange, onFieldValueChange, onFieldLabelChange, onAddField, onRemoveField }) {
  return (
    <div>
      <h3 style={s.sectionTitle}>종합 의견</h3>
      {isEditing
        ? <textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={4}
            style={{ ...s.input, resize: 'vertical', marginBottom: 24 }} />
        : <div style={{ ...s.value, minHeight: 72, whiteSpace: 'pre-wrap', marginBottom: 24 }}>{notes || '내용 없음'}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ ...s.sectionTitle, marginBottom: 0 }}>추가 항목</h3>
        {isEditing && isTeacher && <button onClick={onAddField} style={s.addBtn}>+ 항목 추가</button>}
      </div>
      {customFields.length === 0 && <p style={{ color: '#8b8fa8', fontSize: 14 }}>추가된 항목이 없습니다.</p>}
      {customFields.map((field, idx) => (
        <div key={field.id||idx} style={{ background: '#252836', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #363a52' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            {isEditing && isTeacher
              ? <input value={field.label} onChange={e => onFieldLabelChange(idx, e.target.value)}
                  style={{ ...s.input, width: 160, fontWeight: 'bold', padding: '4px 8px' }} />
              : <label style={{ ...s.label, marginBottom: 0 }}>{field.label}</label>}
            {isEditing && isTeacher && <button onClick={() => onRemoveField(idx)} style={{ ...s.cancelBtn, padding:'2px 8px', fontSize:12 }}>삭제</button>}
          </div>
          {isEditing
            ? <input value={field.value} onChange={e => onFieldValueChange(idx, e.target.value)} style={s.input} />
            : <div style={s.value}>{field.value || '-'}</div>}
        </div>
      ))}
    </div>
  );
}
