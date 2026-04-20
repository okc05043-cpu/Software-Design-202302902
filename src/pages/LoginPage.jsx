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

export default function LoginPage({ onGoRegister, onLogin }) {
  const [selectedRole, setSelectedRole] = useState('teacher')
  const [form, setForm] = useState({ id: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.id.trim() || !form.password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      const { token, user } = await api.login(form.id, form.password, selectedRole)
      localStorage.setItem('token', token)
      onLogin(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#0f1117]">
      <div className="w-full max-w-md overflow-hidden" style={{ background: '#0f1117' }}>
        <div className="px-8 py-6 text-center">
          <h1 className="text-xl font-bold text-white">학생 성적 및 상담 관리 시스템</h1>
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
            <div>
              <label className="block text-sm font-medium text-[#8b8fa8] mb-1">아이디</label>
              <input
                type="text"
                name="id"
                value={form.id}
                onChange={handleChange}
                placeholder={`${ROLES.find(r => r.id === selectedRole).label} 아이디`}
                className={`w-full px-4 py-2.5 text-sm outline-none focus:ring-2 ${color.ring} focus:border-transparent`}
                style={{ background: '#1a1d2e', border: '1px solid #2d3148', color: '#dde0f0' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#8b8fa8] mb-1">비밀번호</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="비밀번호"
                className={`w-full px-4 py-2.5 text-sm outline-none focus:ring-2 ${color.ring} focus:border-transparent`}
                style={{ background: '#1a1d2e', border: '1px solid #2d3148', color: '#dde0f0' }}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${color.button} text-white font-semibold py-2.5 transition-colors disabled:opacity-60`}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="text-center text-sm mt-4">
            <button
              onClick={onGoRegister}
              className="text-[#a89bf7] font-semibold hover:underline"
            >
              회원가입
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
