import React, { useState } from 'react';
import { api } from '../api';
import { FEEDBACK_CATEGORIES, CATEGORY_COLORS } from './constants';
import s from './styles';

export default function FeedbackTab({ studentId, user, isTeacher, isStudent, isParent, isMobile, feedback = [], onRefresh }) {
  const [showForm,       setShowForm]       = useState(false);
  const [form, setForm] = useState({ category: '성적', content: '', shareWithStudent: false, shareWithParent: false });
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom,     setFilterFrom]     = useState('');
  const [filterTo,       setFilterTo]       = useState('');

  const handleAdd = async () => {
    if (!form.content.trim()) return;
    await api.addFeedback(studentId, form);
    if (form.shareWithStudent)
      await api.createNotification({ userId: studentId, type: 'feedback', title: '새 피드백이 작성되었습니다', message: `${form.category} 분야 피드백이 공개되었습니다.`, studentId }).catch(() => {});
    setForm({ category: '성적', content: '', shareWithStudent: false, shareWithParent: false });
    setShowForm(false);
    onRefresh();
  };

  const handleDelete = async (id) => {
    await api.deleteFeedback(id);
    onRefresh();
  };

  const handleToggleShare = async (id, field) => {
    const fb = feedback.find(f => f.id === id);
    await api.patchFeedback(id, field, !fb[field]);
    if (fb && !fb[field] && field === 'shareWithStudent')
      await api.createNotification({ userId: studentId, type: 'feedback', title: '피드백이 공개되었습니다', message: `${fb.category} 분야 피드백을 확인하세요.`, studentId }).catch(() => {});
    onRefresh();
  };

  const visible = isTeacher ? feedback
    : isStudent ? feedback.filter(fb => fb.shareWithStudent)
    : isParent  ? feedback.filter(fb => fb.shareWithParent)
    : [];

  const display = visible.filter(fb => {
    const mc = !filterCategory || fb.category === filterCategory;
    const mf = !filterFrom    || fb.date >= filterFrom;
    const mt = !filterTo      || fb.date <= filterTo;
    return mc && mf && mt;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={s.sectionTitle}>피드백</h3>
        {isTeacher && !showForm && <button onClick={() => setShowForm(true)} style={s.addBtn}>+ 피드백 작성</button>}
      </div>

      {isTeacher && showForm && (
        <div style={{ background: '#1e1b3a', border: '1px solid #4a3f8a', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#a89bf7' }}>새 피드백 작성</h4>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>분류</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FEEDBACK_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setForm(p => ({ ...p, category: cat }))} style={{
                  padding:'4px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:13,
                  background: form.category===cat ? CATEGORY_COLORS[cat] : '#252836',
                  color:      form.category===cat ? 'white' : '#8b8fa8',
                }}>{cat}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>내용</label>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              rows={4} placeholder="피드백 내용을 입력하세요..." style={{ ...s.input, resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>공개 설정</label>
            <div style={{ display: 'flex', gap: 20 }}>
              <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:14, color:'#dde0f0' }}>
                <input type="checkbox" checked={form.shareWithStudent} onChange={e => setForm(p => ({ ...p, shareWithStudent: e.target.checked }))} />
                학생에게 공개
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:14, color:'#dde0f0' }}>
                <input type="checkbox" checked={form.shareWithParent} onChange={e => setForm(p => ({ ...p, shareWithParent: e.target.checked }))} />
                학부모에게 공개
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} style={s.saveBtn}>저장</button>
            <button onClick={() => { setShowForm(false); setForm({ category:'성적', content:'', shareWithStudent:false, shareWithParent:false }); }} style={s.cancelBtn}>취소</button>
          </div>
        </div>
      )}

      {visible.length > 0 && (
        <div style={{ background: '#252836', borderRadius: 8, padding: 10, marginBottom: 14, display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex: '1 1 120px' }}>
            <label style={s.label}>분류 필터</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={s.input}>
              <option value="">전체</option>
              {FEEDBACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={s.label}>시작일</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={s.input} />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={s.label}>종료일</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={s.input} />
          </div>
          {(filterCategory || filterFrom || filterTo) && (
            <button onClick={() => { setFilterCategory(''); setFilterFrom(''); setFilterTo(''); }}
              style={{ ...s.cancelBtn, alignSelf:'flex-end' }}>초기화</button>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p style={{ color:'#8b8fa8', fontSize:14 }}>{isTeacher?'작성된 피드백이 없습니다.':'공개된 피드백이 없습니다.'}</p>
      ) : display.length === 0 ? (
        <p style={{ color:'#8b8fa8', fontSize:14 }}>필터 조건에 맞는 피드백이 없습니다.</p>
      ) : (
        <>
          {(filterCategory||filterFrom||filterTo) && <div style={{ fontSize:13, color:'#8b8fa8', marginBottom:8 }}>{display.length}건 / 전체 {visible.length}건</div>}
          {display.map(fb => (
            <div key={fb.id} style={{ background:'#252836', borderRadius:8, padding:16, marginBottom:12, borderLeft:`4px solid ${CATEGORY_COLORS[fb.category]||'#6b7280'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ background:CATEGORY_COLORS[fb.category]||'#6b7280', color:'white', padding:'2px 10px', borderRadius:20, fontSize:12 }}>{fb.category}</span>
                  <span style={{ fontSize:12, color:'#8b8fa8' }}>{fb.date}</span>
                  <span style={{ fontSize:12, color:'#8b8fa8' }}>by {fb.teacherName}</span>
                </div>
                {isTeacher && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <button onClick={() => handleToggleShare(fb.id,'shareWithStudent')} style={{
                      padding:'2px 8px', borderRadius:4, border:'1px solid', fontSize:11, cursor:'pointer',
                      background: fb.shareWithStudent?'rgba(34,197,94,0.15)':'#1a1d27',
                      color:      fb.shareWithStudent?'#22c55e':'#8b8fa8',
                      borderColor:fb.shareWithStudent?'rgba(34,197,94,0.4)':'#363a52',
                    }}>학생 {fb.shareWithStudent?'공개':'비공개'}</button>
                    <button onClick={() => handleToggleShare(fb.id,'shareWithParent')} style={{
                      padding:'2px 8px', borderRadius:4, border:'1px solid', fontSize:11, cursor:'pointer',
                      background: fb.shareWithParent?'rgba(251,191,36,0.15)':'#1a1d27',
                      color:      fb.shareWithParent?'#fbbf24':'#8b8fa8',
                      borderColor:fb.shareWithParent?'rgba(251,191,36,0.4)':'#363a52',
                    }}>학부모 {fb.shareWithParent?'공개':'비공개'}</button>
                    <button onClick={() => handleDelete(fb.id)} style={{ ...s.cancelBtn, padding:'2px 8px', fontSize:11 }}>삭제</button>
                  </div>
                )}
              </div>
              <p style={{ margin:0, fontSize:14, color:'#dde0f0', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{fb.content}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
