import React, { useState, useEffect } from 'react';
import { getRecords, saveRecords } from './storageHelpers';
import s from './styles';

export default function CounselingTab({ studentId, studentName, user, isTeacher, isMobile, onRefresh }) {
  const [list,        setList]        = useState([]);
  const [showForm,    setShowForm]    = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), content: '', nextPlan: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFrom,  setFilterFrom]  = useState('');
  const [filterTo,    setFilterTo]    = useState('');

  useEffect(() => { load(); }, [studentId]);
  const load = () => setList(getRecords()[studentId]?.counseling || []);

  const persist = (updated) => {
    const records = getRecords();
    if (!records[studentId]) return;
    records[studentId].counseling = updated;
    saveRecords(records);
    setList(updated);
    onRefresh();
  };

  const handleAdd = () => {
    if (!form.content.trim()) return;
    persist([...list, {
      id: String(Date.now()), date: form.date,
      content: form.content.trim(), nextPlan: form.nextPlan.trim(),
      teacherId: user.id, teacherName: user.name, createdAt: new Date().toISOString(),
    }]);
    setForm({ date: new Date().toISOString().slice(0,10), content: '', nextPlan: '' });
    setShowForm(false);
  };

  const handleDelete = (id) => persist(list.filter(c => c.id !== id));

  const filtered = list.filter(c => {
    const q = searchQuery.toLowerCase();
    const mq = !q || c.content.toLowerCase().includes(q) || (c.nextPlan||'').toLowerCase().includes(q) || c.teacherName.toLowerCase().includes(q);
    const mf = !filterFrom || c.date >= filterFrom;
    const mt = !filterTo   || c.date <= filterTo;
    return mq && mf && mt;
  }).sort((a,b) => b.date.localeCompare(a.date));

  if (!isTeacher) {
    return (
      <div>
        <h3 style={s.sectionTitle}>상담 내역</h3>
        <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:16 }}>
          <p style={{ margin:0, fontSize:14, color:'#9a3412' }}>상담 내역은 교사만 열람할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h3 style={s.sectionTitle}>{studentName} 상담 내역</h3>
        {!showForm && <button onClick={() => setShowForm(true)} style={s.addBtn}>+ 상담 기록</button>}
      </div>

      {showForm && (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:16, marginBottom:16 }}>
          <h4 style={{ margin:'0 0 12px', fontSize:14, color:'#166534' }}>새 상담 기록</h4>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={s.label}>상담 날짜</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={s.input} />
            </div>
            <div><label style={s.label}>담당 교사</label><div style={s.value}>{user.name}</div></div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={s.label}>상담 주요 내용 *</label>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              rows={4} placeholder="상담 내용을 입력하세요..." style={{ ...s.input, resize:'vertical' }} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={s.label}>다음 상담 계획</label>
            <textarea value={form.nextPlan} onChange={e => setForm(p => ({ ...p, nextPlan: e.target.value }))}
              rows={2} placeholder="다음 상담 계획 (선택)..." style={{ ...s.input, resize:'vertical' }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleAdd} style={s.saveBtn}>저장</button>
            <button onClick={() => { setShowForm(false); setForm({ date:new Date().toISOString().slice(0,10), content:'', nextPlan:'' }); }} style={s.cancelBtn}>취소</button>
          </div>
        </div>
      )}

      {list.length > 0 && (
        <div style={{ background:'#f9fafb', borderRadius:8, padding:10, marginBottom:14, display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:'1 1 160px' }}>
            <label style={s.label}>내용 검색</label>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="내용, 교사명..." style={s.input} />
          </div>
          <div style={{ flex:'1 1 120px' }}>
            <label style={s.label}>시작일</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={s.input} />
          </div>
          <div style={{ flex:'1 1 120px' }}>
            <label style={s.label}>종료일</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={s.input} />
          </div>
          {(searchQuery||filterFrom||filterTo) && (
            <button onClick={() => { setSearchQuery(''); setFilterFrom(''); setFilterTo(''); }} style={{ ...s.cancelBtn, alignSelf:'flex-end' }}>초기화</button>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <p style={{ color:'#9ca3af', fontSize:14 }}>기록된 상담 내역이 없습니다.</p>
      ) : filtered.length === 0 ? (
        <p style={{ color:'#9ca3af', fontSize:14 }}>검색 조건에 맞는 상담 내역이 없습니다.</p>
      ) : (
        <>
          <div style={{ fontSize:13, color:'#6b7280', marginBottom:8 }}>
            {list.length!==filtered.length ? `${filtered.length}건 / 전체 ${list.length}건` : `총 ${filtered.length}건`}
          </div>
          {filtered.map(c => (
            <div key={c.id} style={{ background:'#f9fafb', borderRadius:8, padding:16, marginBottom:12, borderLeft:'4px solid #16a34a' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ background:'#16a34a', color:'white', padding:'2px 10px', borderRadius:20, fontSize:12 }}>{c.date}</span>
                  <span style={{ fontSize:12, color:'#6b7280' }}>담당: {c.teacherName}</span>
                </div>
                <button onClick={() => handleDelete(c.id)} style={{ ...s.cancelBtn, padding:'2px 8px', fontSize:12 }}>삭제</button>
              </div>
              <div style={{ marginBottom: c.nextPlan?10:0 }}>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:4, fontWeight:600 }}>주요 내용</div>
                <p style={{ margin:0, fontSize:14, color:'#1f2937', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{c.content}</p>
              </div>
              {c.nextPlan && (
                <div style={{ background:'#eff6ff', borderRadius:6, padding:'10px 12px', marginTop:8 }}>
                  <div style={{ fontSize:12, color:'#2563eb', marginBottom:4, fontWeight:600 }}>다음 상담 계획</div>
                  <p style={{ margin:0, fontSize:13, color:'#1e40af', whiteSpace:'pre-wrap' }}>{c.nextPlan}</p>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
