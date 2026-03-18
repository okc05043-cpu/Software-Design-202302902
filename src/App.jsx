import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import './index.css'

function App() {
  const [page, setPage] = useState('login')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {page === 'login' && <LoginPage onGoRegister={() => setPage('register')} />}
      {page === 'register' && <RegisterPage onGoLogin={() => setPage('login')} />}
    </div>
  )
}

export default App
