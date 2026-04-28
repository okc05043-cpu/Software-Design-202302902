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
  const [attendanceEditMode, setAttendanceEditMode] = useState(false);
  const [absentIds,      setAbsentIds]      = useState(new Set());
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendClicked,  setAttendClicked]  = useState(new Set());

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

  const todayStr = () => new Date().toISOString().slice(0, 10);
  const attendKey = (id) => `attend_${id}_${todayStr()}`;

  const handleQuickAttendance = async (studentId) => {
    const key = attendKey(studentId);
    const status = localStorage.getItem(key);
    if (status === '1') return;
    setAttendClicked(prev => new Set(prev).add(studentId));
    setTimeout(() => setAttendClicked(prev => { const n = new Set(prev); n.delete(studentId); return n; }), 800);
    try {
      const rec = await api.getRecord(studentId);
      const att = rec.attendance;
      const updated = {
        ...rec,
        attendance: {
          ...att,
          present: (att.present || 0) + 1,
          absent:  status === 'absent' ? Math.max(0, (att.absent || 0) - 1) : att.absent,
        }
      };
      await api.saveRecord(studentId, updated);
      localStorage.setItem(key, '1');
    } catch (e) { console.error(e); }
  };

  const handleBulkAttendance = async () => {
    setAttendanceSaving(true);
    try {
      await Promise.all(filteredStudents.map(async (st) => {
        const key = attendKey(st.id);
        const status = localStorage.getItem(key);
        const isAbsent = absentIds.has(st.id);
        if (isAbsent && status === '1') {
          // 오늘 출석했는데 결석으로 변경
          const rec = await api.getRecord(st.id);
          const att = rec.attendance;
          await api.saveRecord(st.id, { ...rec, attendance: { ...att, present: Math.max(0, (att.present||0)-1), absent: (att.absent||0)+1 } });
          localStorage.setItem(key, 'absent');
        } else if (!isAbsent && status === 'absent') {
          // 오늘 결석했는데 출석으로 변경
          const rec = await api.getRecord(st.id);
          const att = rec.attendance;
          await api.saveRecord(st.id, { ...rec, attendance: { ...att, present: (att.present||0)+1, absent: Math.max(0,(att.absent||0)-1) } });
          localStorage.setItem(key, '1');
        } else if (!isAbsent && !status) {
          // 오늘 미처리 → 출석
          const rec = await api.getRecord(st.id);
          const att = rec.attendance;
          await api.saveRecord(st.id, { ...rec, attendance: { ...att, present: (att.present||0)+1 } });
          localStorage.setItem(key, '1');
        } else if (isAbsent && !status) {
          // 오늘 미처리 → 결석
          const rec = await api.getRecord(st.id);
          const att = rec.attendance;
          await api.saveRecord(st.id, { ...rec, attendance: { ...att, absent: (att.absent||0)+1 } });
          localStorage.setItem(key, 'absent');
        }
      }));
      setAttendanceEditMode(false);
      setAbsentIds(new Set());
    } catch (e) { console.error(e); }
    finally { setAttendanceSaving(false); }
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
            <div style={{ display: 'flex', gap: 8 }}>
              {!showGlobalSearch && (
                attendanceEditMode ? (
                  <>
                    <button onClick={handleBulkAttendance} disabled={attendanceSaving} style={{ ...s.addBtn, background: '#1a3a2a', color: '#4ade80', borderColor: '#2d6a4f' }}>
                      {attendanceSaving ? '저장 중...' : '적용'}
                    </button>
                    <button onClick={() => { setAttendanceEditMode(false); setAbsentIds(new Set()); }} style={s.cancelBtn}>취소</button>
                  </>
                ) : (
                  <button onClick={() => setAttendanceEditMode(true)} style={{ ...s.addBtn, background: '#1a2a3a', color: '#60a5fa', borderColor: '#1e4a7a' }}>
                    출석편집
                  </button>
                )
              )}
              <button onClick={() => { setShowGlobalSearch(v => !v); setAttendanceEditMode(false); setAbsentIds(new Set()); }} style={{
                ...s.addBtn, background: showGlobalSearch ? '#2d2558' : '#1e1b3a',
              }}>
                {showGlobalSearch ? '← 목록으로' : '통합 검색'}
              </button>
            </div>
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
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setSelectedId(st.id)} style={s.smallBtn}>학생부 보기</button>
                        <button onClick={() => handleQuickAttendance(st.id)} style={{ ...s.smallBtn,
                                  background: attendClicked.has(st.id) ? '#4ade80' : localStorage.getItem(attendKey(st.id)) === '1' ? '#2d3a2d' : '#1a3a2a',
                                  color: attendClicked.has(st.id) ? '#0f2a1a' : '#4ade80',
                                  border: '1px solid #2d6a4f',
                                  opacity: localStorage.getItem(attendKey(st.id)) === '1' ? 0.5 : 1,
                                  transform: attendClicked.has(st.id) ? 'scale(0.93)' : 'scale(1)',
                                  transition: 'all 0.15s',
                                  cursor: localStorage.getItem(attendKey(st.id)) === '1' ? 'default' : 'pointer',
                                }}>
                                {attendClicked.has(st.id) ? '✓' : localStorage.getItem(attendKey(st.id)) === '1' ? '완료' : '출석'}</button>
                      </div>
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
                        {attendanceEditMode && <th style={{ ...s.th, color: '#f87171' }}>결석</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(st => (
                        <tr key={st.id} style={{ borderBottom: '1px solid #2d3148', background: attendanceEditMode && absentIds.has(st.id) ? '#2a1a1a' : 'transparent' }}>
                          <td style={s.td}>{st.name}</td>
                          <td style={s.td}>{st.grade ? `${st.grade}학년` : '-'}</td>
                          <td style={s.td}>{st.classNum ? `${st.classNum}반` : '-'}</td>
                          <td style={s.td}>{st.studentNumber || '-'}</td>
                          <td style={s.td}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => setSelectedId(st.id)} style={s.smallBtn}>학생부 보기</button>
                              {!attendanceEditMode && (
                                <button onClick={() => handleQuickAttendance(st.id)} style={{ ...s.smallBtn,
                                  background: attendClicked.has(st.id) ? '#4ade80' : localStorage.getItem(attendKey(st.id)) === '1' ? '#2d3a2d' : '#1a3a2a',
                                  color: attendClicked.has(st.id) ? '#0f2a1a' : '#4ade80',
                                  border: '1px solid #2d6a4f',
                                  opacity: localStorage.getItem(attendKey(st.id)) === '1' ? 0.5 : 1,
                                  transform: attendClicked.has(st.id) ? 'scale(0.93)' : 'scale(1)',
                                  transition: 'all 0.15s',
                                  cursor: localStorage.getItem(attendKey(st.id)) === '1' ? 'default' : 'pointer',
                                }}>
                                {attendClicked.has(st.id) ? '✓' : localStorage.getItem(attendKey(st.id)) === '1' ? '완료' : '출석'}</button>
                              )}
                            </div>
                          </td>
                          {attendanceEditMode && (
                            <td style={s.td}>
                              <input type="checkbox"
                                checked={absentIds.has(st.id)}
                                onChange={e => {
                                  setAbsentIds(prev => {
                                    const next = new Set(prev);
                                    e.target.checked ? next.add(st.id) : next.delete(st.id);
                                    return next;
                                  });
                                }}
                                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#ef4444' }}
                              />
                            </td>
                          )}
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
