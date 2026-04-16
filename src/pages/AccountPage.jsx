import React, { useState, useEffect } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { TABS, MOCK_STUDENTS } from '../components/constants';
import { getRecords, saveRecords, initRecord, notifyStudentAndParents } from '../components/storageHelpers';
import TopBar from '../components/TopBar';
import GlobalSearchPanel from '../components/GlobalSearchPanel';
import BasicInfoTab from '../components/BasicInfoTab';
import GradeTab from '../components/GradeTab';
import AttendanceTab from '../components/AttendanceTab';
import NotesTab from '../components/NotesTab';
import FeedbackTab from '../components/FeedbackTab';
import CounselingTab from '../components/CounselingTab';
import s from '../components/styles';

export default function AccountPage({ user, onLogout }) {
  const isMobile  = useIsMobile();
  const isTeacher = user.role === 'teacher';
  const isParent  = user.role === 'parent';

  const [studentList,    setStudentList]    = useState([]);
  const [selectedId,     setSelectedId]     = useState(null);
  const [record,         setRecord]         = useState(null);
  const [activeTab,      setActiveTab]      = useState('기본정보');
  const [isEditing,      setIsEditing]      = useState(false);
  const [draft,          setDraft]          = useState(null);
  const [nameSearch,     setNameSearch]     = useState('');
  const [gradeFilter,    setGradeFilter]    = useState('');
  const [classFilter,    setClassFilter]    = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  useEffect(() => {
    const registered = JSON.parse(localStorage.getItem('users') || '[]');
    const regStudents = registered.filter(u => u.role === 'student');
    const all = [...MOCK_STUDENTS];
    regStudents.forEach(s => { if (!all.find(m => m.id === s.id)) all.push(s); });
    setStudentList(all);
    if (!isTeacher) {
      if (user.role === 'student') setSelectedId(user.id);
      if (isParent) {
        const pi = registered.find(u => u.role === 'parent' && u.id === user.id);
        if (pi) { const child = all.find(s => s.name === pi.childName); if (child) setSelectedId(child.id); }
      }
    }
  }, [user]);

  useEffect(() => {
    if (!selectedId) { setRecord(null); return; }
    const records = getRecords();
    if (!records[selectedId]) {
      const info = studentList.find(s => s.id === selectedId) || {};
      records[selectedId] = initRecord(info);
    }
    if (!records[selectedId].feedback)   records[selectedId].feedback   = [];
    if (!records[selectedId].counseling) records[selectedId].counseling = [];
    saveRecords(records);
    setRecord({ ...records[selectedId] });
    setIsEditing(false);
  }, [selectedId, studentList]);

  const persistRecord = (updated) => {
    const records = getRecords();
    records[selectedId] = updated;
    saveRecords(records);
    setRecord(updated);
  };
  const refreshRecord = () => {
    const records = getRecords();
    if (records[selectedId]) setRecord({ ...records[selectedId] });
  };
  const startEdit  = () => { setDraft(JSON.parse(JSON.stringify(record))); setIsEditing(true); };
  const cancelEdit = () => setIsEditing(false);
  const saveEdit   = () => {
    persistRecord(draft);
    setIsEditing(false);
    const sn = draft.basicInfo.name;
    notifyStudentAndParents(selectedId, sn, 'grade', '학생부가 업데이트되었습니다',
      '학생부 정보가 수정되었습니다.', `자녀(${sn})의 학생부 정보가 수정되었습니다.`);
  };

  const cur = isEditing ? draft : record;
  const isInfoTab = ['기본정보', '성적', '출결', '특기사항'].includes(activeTab);

  const filteredStudents = studentList.filter(st => {
    const matchName  = !nameSearch  || st.name.includes(nameSearch);
    const matchGrade = !gradeFilter || String(st.grade) === gradeFilter;
    const matchClass = !classFilter || String(st.classNum) === classFilter;
    return matchName && matchGrade && matchClass;
  });

  if (isTeacher && !selectedId) {
    return (
      <div style={s.page}>
        <TopBar user={user} onLogout={onLogout} isMobile={isMobile} />
        <div style={{ ...s.card, ...(isMobile ? s.cardMobile : {}) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ ...s.sectionTitle, marginBottom: 0 }}>학생 목록</h3>
            <button onClick={() => setShowGlobalSearch(v => !v)} style={{
              ...s.addBtn, background: showGlobalSearch ? '#dbeafe' : '#eff6ff',
            }}>
              {showGlobalSearch ? '← 목록으로' : '통합 검색'}
            </button>
          </div>

          {!showGlobalSearch ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <input value={nameSearch} onChange={e => setNameSearch(e.target.value)}
                  placeholder="이름 검색..." style={{ ...s.input, flex: '1 1 140px', maxWidth: 200 }} />
                <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
                  style={{ ...s.input, flex: '0 0 auto', width: 'auto' }}>
                  <option value="">전체 학년</option>
                  {['1','2','3'].map(g => <option key={g} value={g}>{g}학년</option>)}
                </select>
                <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
                  style={{ ...s.input, flex: '0 0 auto', width: 'auto' }}>
                  <option value="">전체 반</option>
                  {['1','2','3','4','5','6'].map(c => <option key={c} value={c}>{c}반</option>)}
                </select>
                {(nameSearch || gradeFilter || classFilter) && (
                  <button onClick={() => { setNameSearch(''); setGradeFilter(''); setClassFilter(''); }}
                    style={s.cancelBtn}>초기화</button>
                )}
              </div>

              {filteredStudents.length === 0 ? (
                <p style={{ color: '#888', fontSize: 14 }}>검색 결과가 없습니다.</p>
              ) : isMobile ? (
                <div>
                  {filteredStudents.map(st => (
                    <div key={st.id} style={s.studentCard}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 15 }}>{st.name}</div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                          {st.grade ? `${st.grade}학년 ` : ''}{st.classNum ? `${st.classNum}반 ` : ''}{st.studentNumber || ''}
                        </div>
                      </div>
                      <button onClick={() => setSelectedId(st.id)} style={s.smallBtn}>학생부 보기</button>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {(nameSearch || gradeFilter || classFilter) && (
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                      {filteredStudents.length}명 / 전체 {studentList.length}명
                    </div>
                  )}
                  <table style={s.table}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        {['이름','학년','반','학번',''].map(h => <th key={h} style={s.th}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(st => (
                        <tr key={st.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={s.td}>{st.name}</td>
                          <td style={s.td}>{st.grade ? `${st.grade}학년` : '-'}</td>
                          <td style={s.td}>{st.classNum ? `${st.classNum}반` : '-'}</td>
                          <td style={s.td}>{st.studentNumber || '-'}</td>
                          <td style={s.td}><button onClick={() => setSelectedId(st.id)} style={s.smallBtn}>학생부 보기</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          ) : (
            <GlobalSearchPanel studentList={studentList} isMobile={isMobile} onSelectStudent={id => { setShowGlobalSearch(false); setSelectedId(id); }} />
          )}
        </div>
      </div>
    );
  }

  if (!cur) {
    return (
      <div style={s.page}>
        <TopBar user={user} onLogout={onLogout} isMobile={isMobile} />
        {!isTeacher && <p style={{ textAlign: 'center', color: '#888', marginTop: 60 }}>학생부 정보가 없습니다.</p>}
      </div>
    );
  }

  return (
    <div style={s.page}>
      <TopBar user={user} onLogout={onLogout} isMobile={isMobile} />

      {isTeacher && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '0 12px 4px' : '0 20px 4px' }}>
          <button onClick={() => { setSelectedId(null); setIsEditing(false); }} style={s.backBtn}>← 학생 목록으로</button>
        </div>
      )}

      <div style={{ ...s.card, ...(isMobile ? s.cardMobile : {}), background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <span style={{ fontSize: isMobile ? 17 : 20, fontWeight: 'bold' }}>{cur.basicInfo.name}</span>
            <span style={{ color: '#6b7280', marginLeft: 10, fontSize: 14 }}>
              {cur.basicInfo.grade    && `${cur.basicInfo.grade}학년 `}
              {cur.basicInfo.classNum && `${cur.basicInfo.classNum}반 `}
              {cur.basicInfo.studentNumber && `${cur.basicInfo.studentNumber}번`}
            </span>
          </div>
          {isTeacher && isInfoTab && !isEditing && <button onClick={startEdit} style={s.editBtn}>수정</button>}
          {isTeacher && isInfoTab && isEditing && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEdit} style={s.saveBtn}>저장</button>
              <button onClick={cancelEdit} style={s.cancelBtn}>취소</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '0 12px' : '0 20px' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); if (isEditing) setIsEditing(false); }} style={{
              padding: isMobile ? '8px 10px' : '10px 20px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: isMobile ? 12 : 14, whiteSpace: 'nowrap',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              color: activeTab === tab ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: -2,
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ ...s.card, ...(isMobile ? s.cardMobile : {}) }}>
        {activeTab === '기본정보' && (
          <BasicInfoTab info={cur.basicInfo} isEditing={isEditing} isMobile={isMobile}
            onChange={(f, v) => setDraft(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, [f]: v } }))} />
        )}
        {activeTab === '성적' && (
          <GradeTab subjects={cur.subjects} isEditing={isEditing} isTeacher={isTeacher} isMobile={isMobile}
            onScoreChange={(i, v) => setDraft(prev => ({ ...prev, subjects: prev.subjects.map((sub, idx) => idx===i?{...sub,score:Number(v)}:sub) }))}
            onNameChange={(i, v)  => setDraft(prev => ({ ...prev, subjects: prev.subjects.map((sub, idx) => idx===i?{...sub,name:v}:sub) }))}
            onAddSubject={() => setDraft(prev => ({ ...prev, subjects: [...prev.subjects, { name:'새 과목', score:0 }] }))}
            onRemoveSubject={i => setDraft(prev => ({ ...prev, subjects: prev.subjects.filter((_,idx)=>idx!==i) }))} />
        )}
        {activeTab === '출결' && (
          <AttendanceTab attendance={cur.attendance} isEditing={isEditing} isMobile={isMobile}
            onChange={(f, v) => setDraft(prev => ({ ...prev, attendance: { ...prev.attendance, [f]: Number(v) } }))} />
        )}
        {activeTab === '특기사항' && (
          <NotesTab notes={cur.notes} customFields={cur.customFields} isEditing={isEditing} isTeacher={isTeacher}
            onNotesChange={v => setDraft(prev => ({ ...prev, notes: v }))}
            onFieldValueChange={(i,v)  => setDraft(prev => ({ ...prev, customFields: prev.customFields.map((f,idx)=>idx===i?{...f,value:v}:f) }))}
            onFieldLabelChange={(i,v)  => setDraft(prev => ({ ...prev, customFields: prev.customFields.map((f,idx)=>idx===i?{...f,label:v}:f) }))}
            onAddField={() => setDraft(prev => ({ ...prev, customFields: [...prev.customFields, { id:String(Date.now()), label:'새 항목', value:'' }] }))}
            onRemoveField={i => setDraft(prev => ({ ...prev, customFields: prev.customFields.filter((_,idx)=>idx!==i) }))} />
        )}
        {activeTab === '피드백' && (
          <FeedbackTab studentId={selectedId} user={user} isTeacher={isTeacher}
            isStudent={user.role==='student'} isParent={isParent} isMobile={isMobile} onRefresh={refreshRecord} />
        )}
        {activeTab === '상담' && (
          <CounselingTab studentId={selectedId} studentName={cur.basicInfo.name}
            user={user} isTeacher={isTeacher} isMobile={isMobile} onRefresh={refreshRecord} />
        )}
      </div>
    </div>
  );
}
