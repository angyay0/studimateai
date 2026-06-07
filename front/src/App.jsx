import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import UploadGenerate from './pages/UploadGenerate'
import QuizMode from './pages/QuizMode'
import Progress from './pages/Progress'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (token) {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    setIsAuthenticated(false)
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/upload" 
          element={
            isAuthenticated ? <UploadGenerate onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/quiz-mode" 
          element={
            isAuthenticated ? <QuizMode onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/progress" 
          element={
            isAuthenticated ? <Progress onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
      </Routes>
    </Router>
  )
}

export default App
