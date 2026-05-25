import { useState, useRef } from 'react'
import { api } from '../api'

const ROLES = [
  { id: 'student', label: '학생', en: 'STUDENT' },
  { id: 'parent', label: '학부모', en: 'PARENT' },
  { id: 'teacher', label: '교사', en: 'TEACHER' },
]

export default function LoginPage({ onGoRegister, onLogin }) {
  const [selectedRole, setSelectedRole] = useState('student')
  const [form, setForm] = useState({ id: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const idRef = useRef(null)
  const pwRef = useRef(null)

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId)
    setForm({ id: '', password: '' })
    setError('')
    setTimeout(() => idRef.current?.focus(), 0)
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

  const currentRole = ROLES.find(r => r.id === selectedRole)

  return (
    <div className="login-root">

      {/* ── 왼쪽 브랜딩 패널 ── */}
      <aside className="login-aside">
        <div className="aside-center">
          <p className="aside-label">EDUCATION PLATFORM</p>
          <h1 className="aside-title">
            학생<br />
            성적<br />
            관리
          </h1>
          <div className="aside-rule" />
          <p className="aside-sub">상담 · 출결 · 성적 통합 관리</p>
        </div>

        <div className="aside-bottom">
          <div className="stat-row">
            <span className="stat-label">DEPT.</span>
            <span className="stat-value">소프트웨어 설계</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">YEAR</span>
            <span className="stat-value">2026</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">UNIV.</span>
            <span className="stat-value">인천대학교</span>
          </div>
        </div>
      </aside>

      {/* ── 오른쪽 폼 패널 ── */}
      <main className="login-main">
        <div className="login-form-wrap">

          {/* 역할 선택 */}
          <div className="role-header">
            <span className="form-eyebrow">ROLE SELECT</span>
          </div>
          <div className="role-tabs">
            {ROLES.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => handleRoleChange(role.id)}
                className={`role-tab ${selectedRole === role.id ? 'role-tab--active' : ''}`}
              >
                <span className="role-tab-en">{role.en}</span>
                <span className="role-tab-ko">{role.label}</span>
              </button>
            ))}
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="field-group">
              <label className="field-label">ID</label>
              <input
                ref={idRef}
                type="text"
                name="id"
                value={form.id}
                onChange={handleChange}
                placeholder={`${currentRole.label} 아이디 입력`}
                className="field-input"
                autoComplete="username"
              />
            </div>

            <div className="field-group">
              <label className="field-label">PW</label>
              <input
                ref={pwRef}
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="비밀번호 입력"
                className="field-input"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="error-box">
                <span className="error-dot" />
                <p className="error-text">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`submit-btn ${loading ? 'submit-btn--loading' : ''}`}
            >
              {loading ? (
                <span className="submit-spinner" />
              ) : (
                <>
                  <span>로그인</span>
                  <span className="submit-arrow">→</span>
                </>
              )}
            </button>
          </form>

          {/* 회원가입 */}
          <div className="register-row">
            <div className="register-line" />
            <button type="button" onClick={onGoRegister} className="register-link">
              계정 만들기
            </button>
            <div className="register-line" />
          </div>

        </div>
      </main>
    </div>
  )
}
