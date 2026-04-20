const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '서버 오류');
  return data;
}

export const api = {
  // 인증
  login: (id, password, role) => request('POST', '/auth/login', { id, password, role }),
  register: (form, role) => request('POST', '/auth/register', { ...form, role }),

  // 학생
  getStudents: () => request('GET', '/students'),
  getRecord: (studentId) => request('GET', `/students/${studentId}/record`),
  saveRecord: (studentId, record) => request('PUT', `/students/${studentId}/record`, record),
  getMyChild: () => request('GET', '/my-child'),

  // 피드백
  addFeedback: (studentId, data) => request('POST', `/feedback/${studentId}`, data),
  patchFeedback: (id, field, value) => request('PATCH', `/feedback/${id}`, { field, value }),
  deleteFeedback: (id) => request('DELETE', `/feedback/${id}`),

  // 상담
  addCounseling: (studentId, data) => request('POST', `/counseling/${studentId}`, data),
  deleteCounseling: (id) => request('DELETE', `/counseling/${id}`),

  // 알림
  getNotifications: () => request('GET', '/notifications'),
  markRead: (id) => request('PATCH', `/notifications/${id}/read`),
  markAllRead: () => request('PATCH', '/notifications/read-all'),
  createNotification: (data) => request('POST', '/notifications', data),
};
