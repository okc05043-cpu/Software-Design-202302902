import React, { useState } from 'react';
import { getRecords } from './storageHelpers';
import { FEEDBACK_CATEGORIES, CATEGORY_COLORS } from './constants';
import s from './styles';

export default function GlobalSearchPanel({ studentList, isMobile, onSelectStudent }) {
  const [query,          setQuery]          = useState('');
  const [searchType,     setSearchType]     = useState('feedback');
  const [filterFrom,     setFilterFrom]     = useState('');
  const [filterTo,       setFilterTo]       = useState('');
  const [subjectFilter,  setSubjectFilter]  = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [results,        setResults]        = useState(null);

  const handleSearch = () => {
    const records = getRecords();
    const found = [];
    studentList.forEach(st => {
      const rec = records[st.id];
      if (!rec) return;

      if (searchType === 'feedback') {
        const matches = (rec.feedback || []).filter(fb => {
          const mq = !query || fb.content.toLowerCase().includes(query.toLowerCase());
          const mc = !categoryFilter || fb.category === categoryFilter;
          const mf = !filterFrom || fb.date >= filterFrom;
          const mt = !filterTo   || fb.date <= filterTo;
          return mq && mc && mf && mt;
        });
        if (matches.length > 0) found.push({ student: st, type: 'feedback', matches });
      }
      if (searchType === 'counseling') {
        const matches = (rec.counseling || []).filter(c => {
          const mq = !query || c.content.toLowerCase().includes(query.toLowerCase()) || (c.nextPlan||'').toLowerCase().includes(query.toLowerCase());
          const mf = !filterFrom || c.date >= filterFrom;
          const mt = !filterTo   || c.date <= filterTo;
          return mq && mf && mt;
        });
        if (matches.length > 0) found.push({ student: st, type: 'counseling', matches });
      }
      if (searchType === 'grades') {
        const matches = (rec.subjects || []).filter(sub =>
          !subjectFilter || sub.name.includes(subjectFilter)
        );
        if (matches.length > 0) found.push({ student: st, type: 'grades', matches });
      }
      if (searchType === 'notes') {
        const content = rec.notes || '';
        if (!query || content.toLowerCase().includes(query.toLowerCase()))
          found.push({ student: st, type: 'notes', matches: [{ content }] });
      }
    });
    setResults(found);
  };

  const SEARCH_TYPES = [
    { key: 'feedback',   label: '피드백' },
    { key: 'counseling', label: '상담' },
    { key: 'grades',     label: '성적' },
    { key: 'notes',      label: '특기사항' },
  ];

  return (
    <div>
      <h4 style={{ margin: '0 0 14px', fontSize: 14, color: '#dde0f0' }}>통합 검색</h4>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {SEARCH_TYPES.map(t => (
          <button key={t.key} onClick={() => { setSearchType(t.key); setResults(null); setQuery(''); }} style={{
            padding: '4px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
            background: searchType === t.key ? '#7c6af0' : '#252836',
            color:      searchType === t.key ? 'white' : '#8b8fa8',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {searchType === 'grades' ? (
          <input value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
            placeholder="과목명 (예: 수학)..."
            style={{ ...s.input, flex: '1 1 180px' }} onKeyDown={e => e.key==='Enter' && handleSearch()} />
        ) : (
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="검색어 입력..."
            style={{ ...s.input, flex: '1 1 180px' }} onKeyDown={e => e.key==='Enter' && handleSearch()} />
        )}
        {searchType === 'feedback' && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            style={{ ...s.input, flex: '0 0 auto', width: 'auto' }}>
            <option value="">전체 분류</option>
            {FEEDBACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {(searchType === 'feedback' || searchType === 'counseling') && (
          <>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              style={{ ...s.input, flex: '0 0 auto', width: isMobile ? '100%' : 130 }} />
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              style={{ ...s.input, flex: '0 0 auto', width: isMobile ? '100%' : 130 }} />
          </>
        )}
        <button onClick={handleSearch} style={s.smallBtn}>검색</button>
      </div>

      {results === null ? (
        <p style={{ color: '#8b8fa8', fontSize: 14 }}>검색 조건을 입력하고 검색 버튼을 누르세요.</p>
      ) : results.length === 0 ? (
        <p style={{ color: '#8b8fa8', fontSize: 14 }}>검색 결과가 없습니다.</p>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#8b8fa8', marginBottom: 10 }}>총 {results.length}명의 학생에서 결과 발견</div>
          {results.map(({ student, type, matches }) => (
            <div key={student.id} style={{ background: '#252836', borderRadius: 8, padding: 14, marginBottom: 12, borderLeft: '4px solid #7c6af0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <span style={{ fontWeight: 'bold', color: '#dde0f0' }}>{student.name}</span>
                  <span style={{ fontSize: 13, color: '#8b8fa8', marginLeft: 8 }}>
                    {student.grade ? `${student.grade}학년 ` : ''}{student.classNum ? `${student.classNum}반` : ''}
                  </span>
                </div>
                <button onClick={() => onSelectStudent(student.id)} style={s.smallBtn}>학생부 보기</button>
              </div>
              <div style={{ fontSize: 13, color: '#b0b4cc' }}>
                {type === 'feedback' && matches.map((fb, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <span style={{ background: CATEGORY_COLORS[fb.category]||'#6b7280', color:'white', padding:'1px 7px', borderRadius:10, fontSize:11, marginRight:6 }}>{fb.category}</span>
                    <span style={{ fontSize: 11, color: '#8b8fa8' }}>{fb.date}</span>
                    <div style={{ marginTop: 2 }}>{fb.content.slice(0,80)}{fb.content.length>80?'...':''}</div>
                  </div>
                ))}
                {type === 'counseling' && matches.map((c, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#8b8fa8' }}>{c.date} · {c.teacherName}</span>
                    <div style={{ marginTop: 2 }}>{c.content.slice(0,80)}{c.content.length>80?'...':''}</div>
                  </div>
                ))}
                {type === 'grades' && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {matches.map((sub, i) => (
                      <span key={i} style={{ background: '#1e1b3a', color: '#a89bf7', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>
                        {sub.name}: {sub.score}점
                      </span>
                    ))}
                  </div>
                )}
                {type === 'notes' && (
                  <div>{matches[0].content.slice(0,100)}{matches[0].content.length>100?'...':''}</div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
