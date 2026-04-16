import { useState } from 'react'

const ROLES = [
  { id: 'teacher', label: '교사', color: 'blue' },
  { id: 'student', label: '학생', color: 'green' },
  { id: 'parent', label: '학부모', color: 'purple' },
]

const ROLE_COLORS = {
  blue: {
    tab: 'bg-blue-600 text-white',
    button: 'bg-blue-600 hover:bg-blue-700',
    ring: 'focus:ring-blue-500',
  },
  green: {
    tab: 'bg-green-600 text-white',
    button: 'bg-green-600 hover:bg-green-700',
    ring: 'focus:ring-green-500',
  },
  purple: {
    tab: 'bg-purple-600 text-white',
    button: 'bg-purple-600 hover:bg-purple-700',
    ring: 'focus:ring-purple-500',
  },
}

const SUBJECTS = ['국어', '수학', '영어', '과학', '사회', '역사', '체육', '음악', '미술']

export default function RegisterPage({ onGoLogin }) {
  const [selectedRole, setSelectedRole] = useState('teacher')
  const [form, setForm] = useState({
    id: '', password: '', confirmPassword: '', name: '',
    subject: '', employeeNumber: '',
    grade: '', classNum: '', studentNumber: '',
    childName: '', childGrade: '', childClass: '',
  })
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)

  const color = ROLE_COLORS[ROLES.find(r => r.id === selectedRole).color]

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId)
    setErrors({})
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!form.id.trim()) newErrors.id = '아이디를 입력해주세요.'
    else if (form.id.length < 4) newErrors.id = '아이디는 4자 이상이어야 합니다.'
    if (!form.password.trim()) newErrors.password = '비밀번호를 입력해주세요.'
    else if (form.password.length < 4) newErrors.password = '비밀번호는 4자 이상이어야 합니다.'
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.'
    if (!form.name.trim()) newErrors.name = '이름을 입력해주세요.'

    if (selectedRole === 'teacher') {
      if (!form.subject) newErrors.subject = '담당 과목을 선택해주세요.'
      if (!form.employeeNumber.trim()) newErrors.employeeNumber = '사원번호를 입력해주세요.'
    }
    if (selectedRole === 'student') {
      if (!form.grade) newErrors.grade = '학년을 선택해주세요.'
      if (!form.classNum) newErrors.classNum = '반을 선택해주세요.'
      if (!form.studentNumber.trim()) newErrors.studentNumber = '학번을 입력해주세요.'
    }
    if (selectedRole === 'parent') {
      if (!form.childName.trim()) newErrors.childName = '자녀 이름을 입력해주세요.'
      if (!form.childGrade) newErrors.childGrade = '자녀 학년을 선택해주세요.'
      if (!form.childClass) newErrors.childClass = '자녀 반을 선택해주세요.'
    }

    return newErrors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const exists = users.find(u => u.id === form.id && u.role === selectedRole)
    if (exists) {
      setErrors({ id: '이미 사용 중인 아이디입니다.' })
      return
    }

    users.push({ ...form, role: selectedRole })
    localStorage.setItem('users', JSON.stringify(users))
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">회원가입 완료!</h2>
          <p className="text-gray-600 mb-6">
            <span className="font-semibold">{form.name}</span>님, 가입을 환영합니다.
          </p>
          <button
            onClick={onGoLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-indigo-600 px-8 py-6 text-white text-center">
          <div className="text-3xl mb-1">📝</div>
          <h1 className="text-xl font-bold">회원가입</h1>
          <p className="text-indigo-200 text-sm mt-1">역할을 선택하고 정보를 입력해주세요</p>
        </div>

        <div className="px-8 py-6">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleChange(role.id)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  selectedRole === role.id
                    ? ROLE_COLORS[role.color].tab
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {role.icon} {role.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="이름" error={errors.name}>
              <input
                type="text" name="name" value={form.name}
                onChange={handleChange} placeholder="실명을 입력하세요"
                className={inputClass(color.ring, errors.name)}
              />
            </Field>

            <Field label="아이디" error={errors.id}>
              <input
                type="text" name="id" value={form.id}
                onChange={handleChange} placeholder="4자 이상의 아이디"
                className={inputClass(color.ring, errors.id)}
              />
            </Field>

            <Field label="비밀번호" error={errors.password}>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="4자 이상의 비밀번호"
                className={inputClass(color.ring, errors.password)}
              />
            </Field>

            <Field label="비밀번호 확인" error={errors.confirmPassword}>
              <input
                type="password" name="confirmPassword" value={form.confirmPassword}
                onChange={handleChange} placeholder="비밀번호를 다시 입력하세요"
                className={inputClass(color.ring, errors.confirmPassword)}
              />
            </Field>

            {selectedRole === 'teacher' && (
              <>
                <Field label="사원번호" error={errors.employeeNumber}>
                  <input
                    type="text" name="employeeNumber" value={form.employeeNumber}
                    onChange={handleChange} placeholder="교원 사원번호"
                    className={inputClass(color.ring, errors.employeeNumber)}
                  />
                </Field>
                <Field label="담당 과목" error={errors.subject}>
                  <select
                    name="subject" value={form.subject}
                    onChange={handleChange}
                    className={inputClass(color.ring, errors.subject)}
                  >
                    <option value="">과목을 선택하세요</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </>
            )}

            {selectedRole === 'student' && (
              <>
                <Field label="학번" error={errors.studentNumber}>
                  <input
                    type="text" name="studentNumber" value={form.studentNumber}
                    onChange={handleChange} placeholder="학번 (예: 20241001)"
                    className={inputClass(color.ring, errors.studentNumber)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="학년" error={errors.grade}>
                    <select
                      name="grade" value={form.grade}
                      onChange={handleChange}
                      className={inputClass(color.ring, errors.grade)}
                    >
                      <option value="">학년</option>
                      {[1, 2, 3].map(n => <option key={n} value={n}>{n}학년</option>)}
                    </select>
                  </Field>
                  <Field label="반" error={errors.classNum}>
                    <select
                      name="classNum" value={form.classNum}
                      onChange={handleChange}
                      className={inputClass(color.ring, errors.classNum)}
                    >
                      <option value="">반</option>
                      {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}반</option>)}
                    </select>
                  </Field>
                </div>
              </>
            )}

            {selectedRole === 'parent' && (
              <>
                <Field label="자녀 이름" error={errors.childName}>
                  <input
                    type="text" name="childName" value={form.childName}
                    onChange={handleChange} placeholder="자녀의 이름"
                    className={inputClass(color.ring, errors.childName)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="자녀 학년" error={errors.childGrade}>
                    <select
                      name="childGrade" value={form.childGrade}
                      onChange={handleChange}
                      className={inputClass(color.ring, errors.childGrade)}
                    >
                      <option value="">학년</option>
                      {[1, 2, 3].map(n => <option key={n} value={n}>{n}학년</option>)}
                    </select>
                  </Field>
                  <Field label="자녀 반" error={errors.childClass}>
                    <select
                      name="childClass" value={form.childClass}
                      onChange={handleChange}
                      className={inputClass(color.ring, errors.childClass)}
                    >
                      <option value="">반</option>
                      {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}반</option>)}
                    </select>
                  </Field>
                </div>
              </>
            )}

            <button
              type="submit"
              className={`w-full ${color.button} text-white font-semibold py-2.5 rounded-lg transition-colors`}
            >
              회원가입
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            이미 계정이 있으신가요?{' '}
            <button
              onClick={onGoLogin}
              className="text-indigo-600 font-semibold hover:underline"
            >
              로그인
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function inputClass(ringClass, error) {
  return `w-full border ${error ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 ${ringClass} focus:border-transparent`
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
