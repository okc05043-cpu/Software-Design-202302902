import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AccountPage from './pages/AccountPage'
import './index.css'

function App() {
  const [page, setPage] = useState('login')
  const [user, setUser] = useState(null)

  const handleLogin = (userInfo) => {
    setUser(userInfo)
    setPage('account')
  }

  const handleLogout = () => {
    setUser(null)
    setPage('login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117' }}>
      {page === 'login' && <LoginPage onGoRegister={() => setPage('register')} onLogin={handleLogin} />}
      {page === 'register' && <RegisterPage onGoLogin={() => setPage('login')} />}
      {page === 'account' && <AccountPage user={user} onLogout={handleLogout} />}
    </div>
  )
}

export default App
