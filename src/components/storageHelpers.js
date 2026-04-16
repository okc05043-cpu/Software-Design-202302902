export function getRecords() { return JSON.parse(localStorage.getItem('studentRecords') || '{}'); }
export function saveRecords(r) { localStorage.setItem('studentRecords', JSON.stringify(r)); }
export function getNotifications() { return JSON.parse(localStorage.getItem('notifications') || '[]'); }
export function saveNotifications(n) { localStorage.setItem('notifications', JSON.stringify(n)); }

export function createNotification({ userId, type, title, message, studentId }) {
  const list = getNotifications();
  list.unshift({
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId, type, title, message, studentId,
    date: new Date().toISOString(),
    isRead: false,
  });
  saveNotifications(list.slice(0, 200));
}

export function notifyStudentAndParents(studentId, studentName, type, title, msgStudent, msgParent) {
  createNotification({ userId: studentId, type, title, message: msgStudent, studentId });
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  users.filter(u => u.role === 'parent' && u.childName === studentName)
    .forEach(p => createNotification({ userId: p.id, type, title, message: msgParent || msgStudent, studentId }));
}

export function initRecord(info = {}) {
  return {
    basicInfo: { name: info.name||'', grade: info.grade||'', classNum: info.classNum||'', studentNumber: info.studentNumber||'' },
    subjects: [
      { name: '국어', score: 0 }, { name: '영어', score: 0 }, { name: '수학', score: 0 },
      { name: '과학', score: 0 }, { name: '사회', score: 0 },
    ],
    attendance: { present: 0, absent: 0, late: 0, earlyLeave: 0 },
    notes: '', customFields: [
      { id: 'health', label: '건강상태', value: '' },
      { id: 'hobby',  label: '특기/취미', value: '' },
    ],
    feedback: [], counseling: [],
  };
}
