import { useState, useEffect } from 'react'
import { Target, Clock, Award, ChevronRight, Settings, ListChecks, PlayCircle, TimerReset } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { quizzesAPI } from '../services/api'

const difficultyOptions = [
  { value: '', label: 'Sin preferencia' },
  { value: 'Easy', label: 'Facil' },
  { value: 'Medium', label: 'Media' },
  { value: 'Hard', label: 'Dificil' }
]

const initialExamConfig = {
  questionCount: 20,
  durationMinutes: 30,
  difficulty: ''
}

const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const clampNumber = (value, min, max) => {
  const numberValue = Number(value)

  if (Number.isNaN(numberValue)) return min

  return Math.min(Math.max(numberValue, min), max)
}

function QuizMode({ onLogout }) {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [examConfig, setExamConfig] = useState(initialExamConfig)
  const [configSaved, setConfigSaved] = useState(false)
  const [activeExam, setActiveExam] = useState(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  useEffect(() => {
    loadQuizzes()
  }, [])

  useEffect(() => {
    if (!activeExam || remainingSeconds <= 0) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [activeExam, remainingSeconds])

  const loadQuizzes = async () => {
    try {
      const data = await quizzesAPI.getUpcoming()
      setQuizzes(data)
    } catch (error) {
      console.error('Error loading quizzes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    )
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'Medium':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Hard':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const updateExamConfig = (field, value) => {
    setExamConfig((current) => ({
      ...current,
      [field]: value
    }))
    setConfigSaved(false)
  }

  const buildPreparedConfig = () => (
    {
      ...examConfig,
      questionCount: clampNumber(examConfig.questionCount, 5, 50),
      durationMinutes: clampNumber(examConfig.durationMinutes, 5, 180),
      difficulty: examConfig.difficulty || null
    }
  )

  const saveExamConfig = () => {
    const preparedConfig = {
      ...buildPreparedConfig(),
      savedAt: new Date().toISOString()
    }

    sessionStorage.setItem('studimate.examConfig', JSON.stringify(preparedConfig))
    setConfigSaved(true)

    return preparedConfig
  }

  const handleSubmitConfig = (event) => {
    event.preventDefault()
    saveExamConfig()
  }

  const handleStartExam = () => {
    const preparedConfig = saveExamConfig()

    setActiveExam({
      ...preparedConfig,
      startedAt: new Date().toISOString()
    })
    setRemainingSeconds(preparedConfig.durationMinutes * 60)
  }

  const handleResetExam = () => {
    setActiveExam(null)
    setRemainingSeconds(0)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={onLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-6 h-6 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Quiz Mode</h1>
            </div>
            <p className="text-gray-600">Practice with AI-generated quizzes and track your progress</p>
          </div>

          {activeExam && (
            <div className="card mb-8 border-primary-200 bg-white">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <PlayCircle className="w-5 h-5 text-primary-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Examen en curso</h2>
                  </div>
                  <p className="text-gray-600">
                    {activeExam.questionCount} reactivos configurados
                    {activeExam.difficulty ? ` | dificultad ${activeExam.difficulty}` : ' | sin dificultad fija'}
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className={`rounded-xl border px-5 py-4 text-center ${
                    remainingSeconds <= 60
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-green-200 bg-green-50 text-green-700'
                  }`}>
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                      <Clock className="w-4 h-4" />
                      Tiempo restante
                    </div>
                    <p className="mt-1 font-mono text-4xl font-bold tabular-nums">
                      {formatTime(remainingSeconds)}
                    </p>
                  </div>

                  <button type="button" onClick={handleResetExam} className="btn-secondary">
                    <TimerReset className="w-4 h-4" />
                    Reiniciar
                  </button>
                </div>
              </div>

              {remainingSeconds === 0 && (
                <div className="mt-5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">
                  Tiempo agotado. La entrega automatica se conectara en el siguiente incremento.
                </div>
              )}
            </div>
          )}

          <div className="card mb-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-5 h-5 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Configurar examen</h2>
                </div>
                <p className="text-gray-600">
                  Define los reactivos, el tiempo limite y una dificultad opcional antes de iniciar.
                </p>
              </div>

              <div className="rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-800 lg:min-w-[260px]">
                <div className="flex items-center gap-2 font-semibold">
                  <ListChecks className="w-4 h-4" />
                  Resumen
                </div>
                <p className="mt-2">
                  {examConfig.questionCount} reactivos | {examConfig.durationMinutes} min |{' '}
                  {difficultyOptions.find(option => option.value === examConfig.difficulty)?.label}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitConfig} className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div>
                <label htmlFor="questionCount" className="mb-2 block text-sm font-semibold text-gray-900">
                  Numero de reactivos
                </label>
                <input
                  id="questionCount"
                  type="number"
                  min="5"
                  max="50"
                  step="1"
                  value={examConfig.questionCount}
                  onChange={(event) => updateExamConfig('questionCount', event.target.value)}
                  className="input-field"
                  required
                />
                <p className="mt-2 text-xs text-gray-500">Minimo 5, maximo 50 preguntas.</p>
              </div>

              <div>
                <label htmlFor="durationMinutes" className="mb-2 block text-sm font-semibold text-gray-900">
                  Tiempo limite
                </label>
                <div className="relative">
                  <input
                    id="durationMinutes"
                    type="number"
                    min="5"
                    max="180"
                    step="5"
                    value={examConfig.durationMinutes}
                    onChange={(event) => updateExamConfig('durationMinutes', event.target.value)}
                    className="input-field pr-16"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    min
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Entre 5 y 180 minutos.</p>
              </div>

              <div>
                <label htmlFor="difficulty" className="mb-2 block text-sm font-semibold text-gray-900">
                  Dificultad opcional
                </label>
                <select
                  id="difficulty"
                  value={examConfig.difficulty}
                  onChange={(event) => updateExamConfig('difficulty', event.target.value)}
                  className="input-field"
                >
                  {difficultyOptions.map((option) => (
                    <option key={option.value || 'none'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">Puedes dejarla sin preferencia.</p>
              </div>

              <div className="flex flex-col gap-3 lg:col-span-3 sm:flex-row sm:items-center">
                <button type="submit" className="btn-primary">
                  Guardar configuracion
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={handleStartExam} className="btn-secondary">
                  <PlayCircle className="w-4 h-4" />
                  Iniciar examen
                </button>
                {configSaved && (
                  <p className="text-sm font-medium text-green-700">
                    Configuracion lista para iniciar el examen.
                  </p>
                )}
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="stat-card bg-gradient-to-br from-purple-50 to-white border-purple-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">47</p>
                  <p className="text-sm text-gray-600">Total Quizzes</p>
                </div>
              </div>
            </div>

            <div className="stat-card bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">83%</p>
                  <p className="text-sm text-gray-600">Average Score</p>
                </div>
              </div>
            </div>

            <div className="stat-card bg-gradient-to-br from-green-50 to-white border-green-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">15m</p>
                  <p className="text-sm text-gray-600">Avg. Time</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Quizzes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{quiz.title}</h3>
                      <p className="text-gray-600 mb-3">{quiz.subject}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{quiz.time}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(quiz.difficulty)}`}>
                      {quiz.difficulty}
                    </span>
                  </div>
                  <button className="btn-primary w-full">
                    Start Quiz
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Quiz Results</h2>
            <div className="space-y-4">
              {[
                { title: 'Cell Biology — Mitosis', score: 92, date: 'Yesterday', questions: 20 },
                { title: 'Organic Chemistry — Bonds', score: 78, date: '2 days ago', questions: 15 },
                { title: 'World History — WWI', score: 85, date: '3 days ago', questions: 25 }
              ].map((result, index) => (
                <div key={index} className="card">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{result.title}</h3>
                      <p className="text-sm text-gray-500">{result.questions} questions · {result.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        result.score >= 80 ? 'text-green-600' : result.score >= 60 ? 'text-blue-600' : 'text-orange-600'
                      }`}>
                        {result.score}%
                      </p>
                      <p className="text-sm text-gray-500">Score</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuizMode
