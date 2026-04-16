export const TABS = ['기본정보', '성적', '출결', '특기사항', '피드백', '상담'];
export const FEEDBACK_CATEGORIES = ['성적', '행동', '출결', '태도', '기타'];
export const CATEGORY_COLORS = {
  '성적': '#2563eb', '행동': '#16a34a', '출결': '#d97706', '태도': '#7c3aed', '기타': '#6b7280',
};

export const MOCK_STUDENTS = [
  { id: 'student01', name: '이학생', grade: '1', classNum: '1', studentNumber: '20241001', role: 'student' },
];

export const DEFAULT_CUSTOM_FIELDS = [
  { id: 'health', label: '건강상태', value: '' },
  { id: 'hobby',  label: '특기/취미', value: '' },
];
