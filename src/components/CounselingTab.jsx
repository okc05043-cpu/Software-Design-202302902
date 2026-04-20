import React, { useState } from 'react';
import { api } from '../api';
import s from './styles';

export default function CounselingTab({ studentId, studentName, user, isTeacher, isMobile, counseling = [], onRefresh }) {
  const [showForm,    setShowForm]    = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), content: '', nextPlan: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFrom,  setFilterFrom]  = useState('');
  const [filterTo,    setFilterTo]    = useState('');

  const handleAdd = async () => {
    if (!form.content.trim()) return;
    await api.addCounseling(studentId, form);
    setForm({ date: new Date().toISOString().slice(0,10), content: '', nextPlan: '' });
    setShowForm(false);
    onRefresh();
  };

  const handleDelete = async (id) => {
    await api.deleteCounseling(id);
    onRefresh();
  };

  const filtered = counseling.filter(c => {
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
        <div style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:8, padding:16 }}>
          <p style={{ margin:0, fontSize:14, color:'#fbbf24' }}>상담 내역은 교사만 열람할 수 있습니다.</p>
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
        <div style={{ background:'#1a2a1e', border:'1px solid #2d5a37', borderRadius:8, padding:16, marginBottom:16 }}>
          <h4 style={{ margin:'0 0 12px', fontSize:14, color:'#4ade80' }}>새 상담 기록</h4>
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

      {counseling.length > 0 && (
        <div style={{ background:'#252836', borderRadius:8, padding:10, marginBottom:14, display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
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

      {counseling.length === 0 ? (
        <p style={{ color:'#8b8fa8', fontSize:14 }}>기록된 상담 내역이 없습니다.</p>
      ) : filtered.length === 0 ? (
        <p style={{ color:'#8b8fa8', fontSize:14 }}>검색 조건에 맞는 상담 내역이 없습니다.</p>
      ) : (
        <>
          <div style={{ fontSize:13, color:'#8b8fa8', marginBottom:8 }}>
            {counseling.length!==filtered.length ? `${filtered.length}건 / 전체 ${counseling.length}건` : `총 ${filtered.length}건`}
          </div>
          {filtered.map(c => (
            <div key={c.id} style={{ background:'#252836', borderRadius:8, padding:16, marginBottom:12, borderLeft:'4px solid #22c55e' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ background:'#22c55e', color:'white', padding:'2px 10px', borderRadius:20, fontSize:12 }}>{c.date}</span>
                  <span style={{ fontSize:12, color:'#8b8fa8' }}>담당: {c.teacherName}</span>
                </div>
                <button onClick={() => handleDelete(c.id)} style={{ ...s.cancelBtn, padding:'2px 8px', fontSize:12 }}>삭제</button>
              </div>
              <div style={{ marginBottom: c.nextPlan?10:0 }}>
                <div style={{ fontSize:12, color:'#8b8fa8', marginBottom:4, fontWeight:600 }}>주요 내용</div>
                <p style={{ margin:0, fontSize:14, color:'#dde0f0', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{c.content}</p>
              </div>
              {c.nextPlan && (
                <div style={{ background:'#1e1b3a', borderRadius:6, padding:'10px 12px', marginTop:8 }}>
                  <div style={{ fontSize:12, color:'#a89bf7', marginBottom:4, fontWeight:600 }}>다음 상담 계획</div>
                  <p style={{ margin:0, fontSize:13, color:'#b0b4cc', whiteSpace:'pre-wrap' }}>{c.nextPlan}</p>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
