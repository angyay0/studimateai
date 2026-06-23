import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import UploadGenerate from './pages/UploadGenerate'
import Documents from './pages/Documents'
import QuizMode from './pages/QuizMode'
import Progress from './pages/Progress'
import Flashcards from './pages/Flashcards'
import FlashcardReview from './pages/FlashcardReview'
import TakeQuiz from './pages/TakeQuiz'
import { authAPI } from './services/api'

const idleTimeoutMs = 45 * 60 * 1000

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authAPI.hasSession())
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const validateExistingSession = async () => {
      if (!authAPI.hasSession()) {
        setCheckingSession(false)
        return
      }

      try {
        await authAPI.validateSession()
        setIsAuthenticated(true)
      } catch {
        setIsAuthenticated(false)
      } finally {
        setCheckingSession(false)
      }
    }

    validateExistingSession()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined
    }

    let timeoutId

    const resetIdleTimer = () => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        handleLogout()
      }, idleTimeoutMs)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(event => window.addEventListener(event, resetIdleTimer))
    resetIdleTimer()

    return () => {
      window.clearTimeout(timeoutId)
      events.forEach(event => window.removeEventListener(event, resetIdleTimer))
    }
  }, [isAuthenticated])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = async () => {
    await authAPI.logout()
    setIsAuthenticated(false)
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Checking session...</p>
      </div>
    )
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
          path="/documents" 
          element={
            isAuthenticated ? <Documents onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/quiz-mode" 
          element={
            isAuthenticated ? <QuizMode onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/quiz/take" 
          element={
            isAuthenticated ? <TakeQuiz onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/progress" 
          element={
            isAuthenticated ? <Progress onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/flashcards" 
          element={
            isAuthenticated ? <Flashcards onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/flashcards/review" 
          element={
            isAuthenticated ? <FlashcardReview onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
      </Routes>
    </Router>
  )
}

export default App
