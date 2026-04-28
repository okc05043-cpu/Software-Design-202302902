import React, { useState, useEffect } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { TABS } from '../components/constants';
import { api } from '../api';
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
  const [loading,        setLoading]        = useState(false);

  useEffect(() => {
    if (isTeacher) {
      api.getStudents().then(setStudentList).catch(console.error);
    } else if (user.role === 'student') {
      setSelectedId(user.id);
    } else if (isParent) {
      api.getMyChild().then(({ child }) => {
        if (child) setSelectedId(child.id);
      }).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (!selectedId) { setRecord(null); return; }
    setLoading(true);
    api.getRecord(selectedId)
      .then(data => { setRecord(data); setIsEditing(false); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedId]);

  const refreshRecord = () => {
    if (!selectedId) return;
    api.getRecord(selectedId).then(setRecord).catch(console.error);
  };

  const startEdit  = () => { setDraft(JSON.parse(JSON.stringify(record))); setIsEditing(true); };
  const cancelEdit = () => setIsEditing(false);
  const saveEdit   = async () => {
    await api.saveRecord(selectedId, draft);
    setRecord(draft);
    setIsEditing(false);
    // 알림 생성
    const sn = draft.basicInfo.name;
    api.createNotification({ userId: selectedId, type: 'grade', title: '학생부가 업데이트되었습니다', message: '학생부 정보가 수정되었습니다.', studentId: selectedId }).catch(() => {});
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
              ...s.addBtn, background: showGlobalSearch ? '#2d2558' : '#1e1b3a',
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
                <p style={{ color: '#8b8fa8', fontSize: 14 }}>검색 결과가 없습니다.</p>
              ) : isMobile ? (
                <div>
                  {filteredStudents.map(st => (
                    <div key={st.id} style={s.studentCard}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 15, color: '#dde0f0' }}>{st.name}</div>
                        <div style={{ fontSize: 13, color: '#8b8fa8', marginTop: 2 }}>
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
                    <div style={{ fontSize: 13, color: '#8b8fa8', marginBottom: 8 }}>
                      {filteredStudents.length}명 / 전체 {studentList.length}명
                    </div>
                  )}
                  <table style={s.table}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #2d3148' }}>
                        {['이름','학년','반','학번',''].map(h => <th key={h} style={s.th}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(st => (
                        <tr key={st.id} style={{ borderBottom: '1px solid #2d3148' }}>
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

  if (loading || !cur) {
    return (
      <div style={s.page}>
        <TopBar user={user} onLogout={onLogout} isMobile={isMobile} />
        <p style={{ textAlign: 'center', color: '#8b8fa8', marginTop: 60 }}>
          {loading ? '불러오는 중...' : '학생부 정보가 없습니다.'}
        </p>
      </div>
    );
  }

  const schoolName = cur?.schoolName || user?.schoolName || null;

  return (
    <div style={s.page}>
      <TopBar user={user} onLogout={onLogout} isMobile={isMobile} />

      {isTeacher && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '0 12px 4px' : '0 20px 4px' }}>
          <button onClick={() => { setSelectedId(null); setIsEditing(false); }} style={s.backBtn}>← 학생 목록으로</button>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '0 12px' : '0 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* 좌측 프로필 카드 */}
        {!isMobile && (
          <div style={{ width: 180, flexShrink: 0, background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', minHeight: 220 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#2d2558', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#a89bf7', fontWeight: 'bold', marginBottom: 14 }}>
              {cur.basicInfo.name?.[0] ?? '?'}
            </div>
            <div style={{ fontWeight: 'bold', fontSize: 16, color: '#dde0f0', marginBottom: 8 }}>{cur.basicInfo.name}</div>
            {cur.basicInfo.grade && (
              <div style={{ fontSize: 13, color: '#8b8fa8', marginBottom: 4 }}>{cur.basicInfo.grade}학년 {cur.basicInfo.classNum}반</div>
            )}
            {cur.basicInfo.studentNumber && (
              <div style={{ fontSize: 13, color: '#8b8fa8', marginBottom: 4 }}>{cur.basicInfo.studentNumber}번</div>
            )}
            <div style={{ flex: 1 }} />
            {schoolName && (
              <div style={{ fontSize: 12, color: '#7c6af0', borderTop: '1px solid #2d3148', paddingTop: 12, marginTop: 8, wordBreak: 'keep-all' }}>
                {schoolName}
              </div>
            )}
          </div>
        )}

        {/* 우측 메인 콘텐츠 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 모바일용 학생 정보 헤더 */}
          {isMobile && (
            <div style={{ background: '#1e1b3a', border: '1px solid #4a3f8a', borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 17, fontWeight: 'bold', color: '#dde0f0' }}>{cur.basicInfo.name}</span>
                  <span style={{ color: '#8b8fa8', marginLeft: 8, fontSize: 13 }}>
                    {cur.basicInfo.grade && `${cur.basicInfo.grade}학년 `}
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
          )}

          {/* 데스크탑 수정 버튼 */}
          {!isMobile && isTeacher && isInfoTab && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              {!isEditing && <button onClick={startEdit} style={s.editBtn}>수정</button>}
              {isEditing && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveEdit} style={s.saveBtn}>저장</button>
                  <button onClick={cancelEdit} style={s.cancelBtn}>취소</button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', borderBottom: '2px solid #2d3148', overflowX: 'auto', marginBottom: 0 }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); if (isEditing) setIsEditing(false); }} style={{
                padding: isMobile ? '8px 10px' : '10px 20px',
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: isMobile ? 12 : 14, whiteSpace: 'nowrap',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                color: activeTab === tab ? '#a89bf7' : '#8b8fa8',
                borderBottom: activeTab === tab ? '2px solid #7c6af0' : '2px solid transparent',
                marginBottom: -2,
              }}>{tab}</button>
            ))}
          </div>

          <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: '0 0 12px 12px', padding: isMobile ? 14 : 20, marginTop: 0 }}>
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
                isStudent={user.role==='student'} isParent={isParent} isMobile={isMobile}
                feedback={cur.feedback} onRefresh={refreshRecord} />
            )}
            {activeTab === '상담' && (
              <CounselingTab studentId={selectedId} studentName={cur.basicInfo.name}
                user={user} isTeacher={isTeacher} isMobile={isMobile}
                counseling={cur.counseling} onRefresh={refreshRecord} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
