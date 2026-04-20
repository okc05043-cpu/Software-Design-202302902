import { useState } from 'react'
import { api } from '../api'

const ROLES = [
  { id: 'teacher', label: '교사', color: 'indigo' },
  { id: 'student', label: '학생', color: 'emerald' },
  { id: 'parent', label: '학부모', color: 'violet' },
]

const ROLE_COLORS = {
  indigo: {
    button: 'bg-indigo-600 hover:bg-indigo-500',
    ring: 'focus:ring-indigo-500',
    selected: '#3730a3',
  },
  emerald: {
    button: 'bg-emerald-600 hover:bg-emerald-500',
    ring: 'focus:ring-emerald-500',
    selected: '#065f46',
  },
  violet: {
    button: 'bg-violet-600 hover:bg-violet-500',
    ring: 'focus:ring-violet-500',
    selected: '#4c1d95',
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
  const [loading, setLoading] = useState(false)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setLoading(true)
    try {
      const { token, user } = await api.register(form, selectedRole)
      localStorage.setItem('token', token)
      setSuccess(true)
    } catch (err) {
      if (err.message.includes('아이디')) setErrors({ id: err.message })
      else setErrors({ submit: err.message })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f1117]">
        <div className="p-10 text-center max-w-sm w-full" style={{ background: '#0f1117' }}>
          <h2 className="text-2xl font-bold text-white mb-2">회원가입 완료</h2>
          <p className="text-[#8b8fa8] mb-6">
            <span className="font-semibold text-[#dde0f0]">{form.name}</span>님, 가입을 환영합니다.
          </p>
          <button
            onClick={onGoLogin}
            className="w-full bg-[#7c6af0] hover:bg-[#6a59d4] text-white font-semibold py-2.5 transition-colors"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#0f1117]">
      <div className="w-full max-w-md overflow-hidden" style={{ background: '#0f1117' }}>
        <div className="px-8 py-6 text-center">
          <h1 className="text-xl font-bold text-white">회원가입</h1>
        </div>

        <div className="px-8 py-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#8b8fa8] mb-1">역할 선택</label>
            <div className="border border-[#2d3148]" style={{ background: '#1a1d2e' }}>
              {ROLES.map((role, idx) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleChange(role.id)}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    background: selectedRole === role.id ? ROLE_COLORS[role.color].selected : '#1a1d2e',
                    color: selectedRole === role.id ? '#fff' : '#8b8fa8',
                    borderBottom: idx < ROLES.length - 1 ? '1px solid #2d3148' : 'none',
                  }}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="이름" error={errors.name}>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="실명을 입력하세요" className={inputClass(color.ring, errors.name)} />
            </Field>

            <Field label="아이디" error={errors.id}>
              <input type="text" name="id" value={form.id} onChange={handleChange}
                placeholder="4자 이상의 아이디" className={inputClass(color.ring, errors.id)} />
            </Field>

            <Field label="비밀번호" error={errors.password}>
              <input type="password" name="password" value={form.password} onChange={handleChange}
                placeholder="4자 이상의 비밀번호" className={inputClass(color.ring, errors.password)} />
            </Field>

            <Field label="비밀번호 확인" error={errors.confirmPassword}>
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                placeholder="비밀번호를 다시 입력하세요" className={inputClass(color.ring, errors.confirmPassword)} />
            </Field>

            {selectedRole === 'teacher' && (
              <>
                <Field label="사원번호" error={errors.employeeNumber}>
                  <input type="text" name="employeeNumber" value={form.employeeNumber} onChange={handleChange}
                    placeholder="교원 사원번호" className={inputClass(color.ring, errors.employeeNumber)} />
                </Field>
                <Field label="담당 과목" error={errors.subject}>
                  <select name="subject" value={form.subject} onChange={handleChange}
                    className={inputClass(color.ring, errors.subject)}>
                    <option value="">과목을 선택하세요</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </>
            )}

            {selectedRole === 'student' && (
              <>
                <Field label="학번" error={errors.studentNumber}>
                  <input type="text" name="studentNumber" value={form.studentNumber} onChange={handleChange}
                    placeholder="학번 (예: 20241001)" className={inputClass(color.ring, errors.studentNumber)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="학년" error={errors.grade}>
                    <select name="grade" value={form.grade} onChange={handleChange}
                      className={inputClass(color.ring, errors.grade)}>
                      <option value="">학년</option>
                      {[1,2,3].map(n => <option key={n} value={n}>{n}학년</option>)}
                    </select>
                  </Field>
                  <Field label="반" error={errors.classNum}>
                    <select name="classNum" value={form.classNum} onChange={handleChange}
                      className={inputClass(color.ring, errors.classNum)}>
                      <option value="">반</option>
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}반</option>)}
                    </select>
                  </Field>
                </div>
              </>
            )}

            {selectedRole === 'parent' && (
              <>
                <Field label="자녀 이름" error={errors.childName}>
                  <input type="text" name="childName" value={form.childName} onChange={handleChange}
                    placeholder="자녀의 이름" className={inputClass(color.ring, errors.childName)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="자녀 학년" error={errors.childGrade}>
                    <select name="childGrade" value={form.childGrade} onChange={handleChange}
                      className={inputClass(color.ring, errors.childGrade)}>
                      <option value="">학년</option>
                      {[1,2,3].map(n => <option key={n} value={n}>{n}학년</option>)}
                    </select>
                  </Field>
                  <Field label="자녀 반" error={errors.childClass}>
                    <select name="childClass" value={form.childClass} onChange={handleChange}
                      className={inputClass(color.ring, errors.childClass)}>
                      <option value="">반</option>
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}반</option>)}
                    </select>
                  </Field>
                </div>
              </>
            )}

            {errors.submit && (
              <p className="text-red-400 text-sm px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {errors.submit}
              </p>
            )}

            <button type="submit" disabled={loading}
              className={`w-full ${color.button} text-white font-semibold py-2.5 transition-colors disabled:opacity-60`}>
              {loading ? '처리 중...' : '회원가입'}
            </button>
          </form>

          <p className="text-center text-sm mt-4">
            <button onClick={onGoLogin} className="text-[#a89bf7] font-semibold hover:underline">
              로그인
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function inputClass(ringClass, error) {
  return `w-full px-4 py-2.5 text-sm outline-none focus:ring-2 ${ringClass} focus:border-transparent text-[#dde0f0] border ${error ? 'border-red-500' : 'border-[#2d3148]'}`
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#8b8fa8] mb-1">{label}</label>
      <div style={{ position: 'relative', background: '#1a1d2e', colorScheme: 'dark' }}>
        {children}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
