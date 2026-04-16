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

const MOCK_USERS = {
  teacher: [{ id: 'teacher01', password: '1234', name: '김선생' }],
  student: [{ id: 'student01', password: '1234', name: '이학생' }],
  parent: [{ id: 'parent01', password: '1234', name: '박학부모' }],
}

export default function LoginPage({ onGoRegister, onLogin }) {
  const [selectedRole, setSelectedRole] = useState('teacher')
  const [form, setForm] = useState({ id: '', password: '' })
  const [error, setError] = useState('')

  const color = ROLE_COLORS[ROLES.find(r => r.id === selectedRole).color]

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId)
    setForm({ id: '', password: '' })
    setError('')
  }

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.id.trim() || !form.password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.')
      return
    }

    const registered = JSON.parse(localStorage.getItem('users') || '[]')
    const found =
      registered.find(u => u.role === selectedRole && u.id === form.id && u.password === form.password) ||
      MOCK_USERS[selectedRole].find(u => u.id === form.id && u.password === form.password)

    if (!found) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      return
    }

    onLogin({ id: found.id, name: found.name, role: selectedRole })
  }

  return ( 
    <div
      style = {{
        backgroudnImage : 'url(${bgIamge})',
        backgroudnsize : 'cover',
        backgroudposition : 'center',
        backgroundcolor : "#FFFFFF",

      }}
    > 
      <div className = "min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-indigo-600 px-8 py-6 text-white text-center">
          <h1 className="text-xl font-bold">학생 성적 및 상담 관리 시스템</h1>
          <p className="text-indigo-200 text-sm mt-1">로그인하여 서비스를 이용하세요</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
              <input
                type="text"
                name="id"
                value={form.id}
                onChange={handleChange}
                placeholder={`${ROLES.find(r => r.id === selectedRole).label} 아이디`}
                className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 ${color.ring} focus:border-transparent`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="비밀번호"
                className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 ${color.ring} focus:border-transparent`}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              className={`w-full ${color.button} text-white font-semibold py-2.5 rounded-lg transition-colors`}
            >
              로그인
            </button>
          </form>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200"> 나중에 지우기(테스트 계정)
            <p className="text-xs text-gray-400">아이디: teacher01 / student01 / parent01</p>
            <p className="text-xs text-gray-400">비밀번호: 1234</p>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            계정이 없으신가요?{' '}
            <button
              onClick={onGoRegister}
              className="text-indigo-600 font-semibold hover:underline"
            >
              회원가입
            </button>
          </p>
        </div>
      </div>
    </div>
    </div>
  )
}