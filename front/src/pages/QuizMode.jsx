import { useCallback, useEffect, useState } from 'react'
import {
  Target,
  Clock,
  Award,
  ChevronRight,
  Settings,
  ListChecks,
  PlayCircle,
  TimerReset,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { documentsAPI, quizzesAPI } from '../services/api'

const attemptsStorageKey = 'studimate.examAttempts'

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

const getStoredAttempts = () => {
  try {
    return JSON.parse(localStorage.getItem(attemptsStorageKey)) || []
  } catch {
    return []
  }
}

const saveStoredAttempt = (attempt) => {
  const attempts = [attempt, ...getStoredAttempts()].slice(0, 10)
  localStorage.setItem(attemptsStorageKey, JSON.stringify(attempts))
  return attempts
}

const mergeAttempts = (backendAttempts, localAttempts) => {
  const seen = new Set()

  return [...backendAttempts, ...localAttempts]
    .filter((attempt) => {
      const key = attempt.id || `${attempt.submittedAt}-${attempt.score}-${attempt.totalQuestions}-${attempt.correctAnswers}`

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
}

const getChoiceIndex = (value) => {
  if (typeof value !== 'string') return null

  const match = value.trim().match(/^([A-Z])(?:[\.\)]\s+|$)/i)
  if (!match) return null

  const index = match[1].toUpperCase().charCodeAt(0) - 65
  return index >= 0 ? index : null
}

const normalizeChoiceText = (value, question) => {
  if (typeof value !== 'string') return value

  const choiceIndex = getChoiceIndex(value)
  if (choiceIndex !== null && question?.options?.[choiceIndex]) {
    return question.options[choiceIndex]
  }

  return value.replace(/^([A-Z])(?:[\.\)]\s+|$)/i, '').trim() || value.trim()
}

function QuizMode({ onLogout }) {
  const [quizzes, setQuizzes] = useState([])
  const [documents, setDocuments] = useState([])
  const [selectedDocId, setSelectedDocId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [examConfig, setExamConfig] = useState(initialExamConfig)
  const [configSaved, setConfigSaved] = useState(false)
  const [activeExam, setActiveExam] = useState(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [recentAttempts, setRecentAttempts] = useState([])
  const [attemptSaveStatus, setAttemptSaveStatus] = useState(null)
  const [examError, setExamError] = useState(null)
  const [generatingExam, setGeneratingExam] = useState(false)

  const loadQuizzes = useCallback(async () => {
    try {
      const data = await quizzesAPI.getUpcoming()
      setQuizzes(data)
    } catch (error) {
      console.error('Error loading quizzes:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await documentsAPI.getAll()
      setDocuments(docs)

      setSelectedDocId((currentSelectedId) => {
        if (currentSelectedId && docs.some((doc) => doc.id === currentSelectedId && doc.status === 'indexed')) {
          return currentSelectedId
        }

        const indexedDoc = docs.find((doc) => doc.status === 'indexed')
        return indexedDoc?.id || docs[0]?.id || null
      })

      return docs
    } catch (error) {
      console.error('Error loading documents:', error)
      setDocuments([])
      setSelectedDocId(null)
      return []
    }
  }, [])

  const loadAttempts = useCallback(async () => {
    try {
      const backendAttempts = await quizzesAPI.getAttempts()
      setRecentAttempts(mergeAttempts(backendAttempts, getStoredAttempts()))
    } catch (error) {
      console.error('Error loading exam attempts:', error)
      setRecentAttempts(getStoredAttempts())
    }
  }, [])

  useEffect(() => {
    loadQuizzes()
    loadDocuments()
    loadAttempts()
  }, [loadQuizzes, loadDocuments, loadAttempts])

  useEffect(() => {
    if (!activeExam || result || remainingSeconds <= 0) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [activeExam, remainingSeconds, result])

  const buildPreparedConfig = useCallback(() => (
    {
      ...examConfig,
      questionCount: clampNumber(examConfig.questionCount, 5, 50),
      durationMinutes: clampNumber(examConfig.durationMinutes, 5, 180),
      difficulty: examConfig.difficulty || null
    }
  ), [examConfig])

  const gradeExam = useCallback((exam, submittedAnswers, submitReason) => {
    const totalQuestions = exam.questions.length
    const reviewedQuestions = exam.questions.map((question) => {
      const selectedAnswer = submittedAnswers[question.id] || null
      const normalizedSelectedAnswer = normalizeChoiceText(selectedAnswer, question)
      const normalizedCorrectAnswer = normalizeChoiceText(question.correctAnswer, question)
      const isCorrect = normalizedSelectedAnswer === normalizedCorrectAnswer

      return {
        ...question,
        selectedAnswer,
        selectedAnswerLabel: normalizedSelectedAnswer,
        correctAnswerLabel: normalizedCorrectAnswer,
        isCorrect
      }
    })
    const correctAnswers = reviewedQuestions.filter((question) => question.isCorrect).length
    const incorrectAnswers = totalQuestions - correctAnswers
    const score = Math.round((correctAnswers / totalQuestions) * 100)
    const timeTakenSeconds = (exam.durationMinutes * 60) - remainingSeconds

    return {
      id: `attempt-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      submitReason,
      score,
      correctAnswers,
      incorrectAnswers,
      totalQuestions,
      timeTakenSeconds,
      config: {
        questionCount: exam.questionCount,
        durationMinutes: exam.durationMinutes,
        difficulty: exam.difficulty,
        sourceDocumentId: exam.sourceDocumentId,
        sourceDocumentTitle: exam.sourceDocumentTitle
      },
      questions: reviewedQuestions
    }
  }, [remainingSeconds])

  const handleSubmitExam = useCallback(async (submitReason = 'manual') => {
    if (!activeExam || result) return

    const gradedAttempt = gradeExam(activeExam, answers, submitReason)

    setResult(gradedAttempt)
    setActiveExam(null)
    setRemainingSeconds(0)
    setAttemptSaveStatus('saving')

    try {
      const savedAttempt = await quizzesAPI.saveAttempt(gradedAttempt)
      setResult(savedAttempt)
      setRecentAttempts((current) => [savedAttempt, ...current].slice(0, 10))
      setAttemptSaveStatus('saved')
    } catch (error) {
      console.error('Error saving exam attempt:', error)
      const attempts = saveStoredAttempt(gradedAttempt)
      setRecentAttempts(attempts)
      setAttemptSaveStatus('local')
    }
  }, [activeExam, answers, gradeExam, result])

  useEffect(() => {
    if (activeExam && !result && remainingSeconds === 0) {
      handleSubmitExam('auto')
    }
  }, [activeExam, handleSubmitExam, remainingSeconds, result])

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

  const handleStartExam = async () => {
    setExamError(null)

    const selectedDoc = documents.find((doc) => doc.id === selectedDocId)

    if (!selectedDoc) {
      setExamError('Selecciona un documento indexado para generar el examen.')
      return
    }

    if (selectedDoc.status !== 'indexed') {
      setExamError('El documento seleccionado todavía no está indexado.')
      return
    }

    const preparedConfig = saveExamConfig()

    setGeneratingExam(true)
    try {
      const generatedExam = await quizzesAPI.generate(undefined, {
        ...preparedConfig,
        documentIds: [selectedDoc.id]
      })
      const questions = generatedExam.questions.map((question, index) => ({
        id: index + 1,
        topic: selectedDoc.title || selectedDoc.originalFilename || 'Documento subido',
        question: question.question,
        options: question.options || [],
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        difficulty: question.difficulty || preparedConfig.difficulty || 'medium'
      }))

      setActiveExam({
        ...preparedConfig,
        id: generatedExam.id,
        sourceDocumentId: selectedDoc.id,
        sourceDocumentTitle: selectedDoc.title || selectedDoc.originalFilename,
        questions,
        startedAt: new Date().toISOString()
      })
      setRemainingSeconds(preparedConfig.durationMinutes * 60)
      setAnswers({})
      setResult(null)
      setAttemptSaveStatus(null)
    } catch (error) {
      console.error('Error generating exam:', error)
      setExamError(error.message || 'No se pudo generar el examen.')
    } finally {
      setGeneratingExam(false)
    }
  }

  const handleResetExam = () => {
    setActiveExam(null)
    setRemainingSeconds(0)
    setAnswers({})
    setExamError(null)
  }

  const handleAnswerQuestion = (questionId, option) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: option
    }))
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

          {examError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span className="text-sm">{examError}</span>
              <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setExamError(null)}>✕</button>
            </div>
          )}

          {result && (
            <div className="card mb-8 border-green-200">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-6 h-6 text-green-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Resultados del examen</h2>
                  </div>
                  <p className="text-gray-600">
                    Entrega {result.submitReason === 'auto' ? 'automatica por tiempo agotado' : 'manual'} registrada en el historial.
                  </p>
                  {attemptSaveStatus === 'saving' && (
                    <p className="mt-2 text-sm font-medium text-blue-700">Guardando intento...</p>
                  )}
                  {attemptSaveStatus === 'saved' && (
                    <p className="mt-2 text-sm font-medium text-green-700">Intento guardado en backend.</p>
                  )}
                  {attemptSaveStatus === 'local' && (
                    <p className="mt-2 text-sm font-medium text-orange-700">
                      No se pudo guardar en backend. Se guardo localmente como respaldo.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-primary-50 px-4 py-3 text-center">
                    <p className="text-xs font-semibold text-primary-700">Calificacion</p>
                    <p className="text-3xl font-bold text-primary-700">{result.score}%</p>
                  </div>
                  <div className="rounded-lg bg-green-50 px-4 py-3 text-center">
                    <p className="text-xs font-semibold text-green-700">Aciertos</p>
                    <p className="text-3xl font-bold text-green-700">{result.correctAnswers}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-center">
                    <p className="text-xs font-semibold text-red-700">Errores</p>
                    <p className="text-3xl font-bold text-red-700">{result.incorrectAnswers}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 px-4 py-3 text-center">
                    <p className="text-xs font-semibold text-blue-700">Tiempo</p>
                    <p className="text-3xl font-bold text-blue-700">{formatTime(result.timeTakenSeconds)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="mb-4 text-xl font-bold text-gray-900">Revision de reactivos</h3>
                <div className="space-y-4">
                  {result.questions.map((question) => (
                    <div key={question.id} className="rounded-xl border border-gray-200 bg-white p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-500">Reactivo {question.id} | {question.topic}</p>
                          <h4 className="mt-1 font-semibold text-gray-900">{question.question}</h4>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          question.isCorrect
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {question.isCorrect ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {question.isCorrect ? 'Correcto' : 'Incorrecto'}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                          <span className="font-semibold">Tu respuesta:</span> {normalizeChoiceText(question.selectedAnswerLabel || question.selectedAnswer, question) || 'Sin responder'}
                        </p>
                        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                          <span className="font-semibold">Respuesta correcta:</span> {normalizeChoiceText(question.correctAnswerLabel || question.correctAnswer, question)}
                        </p>
                      </div>
                      <p className="mt-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        <span className="font-semibold">Explicacion:</span> {question.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                  {activeExam.sourceDocumentTitle && (
                    <p className="mt-1 text-sm text-gray-500">
                      Documento fuente: {activeExam.sourceDocumentTitle}
                    </p>
                  )}
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

                  <button type="button" onClick={() => handleSubmitExam('manual')} className="btn-primary">
                    Entregar examen
                  </button>
                  <button type="button" onClick={handleResetExam} className="btn-secondary">
                    <TimerReset className="w-4 h-4" />
                    Reiniciar
                  </button>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                {activeExam.questions.map((question) => (
                  <div key={question.id} className="rounded-xl border border-gray-200 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-500">Reactivo {question.id} | {question.topic}</p>
                        <h3 className="mt-1 font-semibold text-gray-900">{question.question}</h3>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {question.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleAnswerQuestion(question.id, option)}
                          className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                            answers[question.id] === option
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!activeExam && (
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
                  <button type="button" onClick={handleStartExam} className="btn-secondary" disabled={generatingExam}>
                    <PlayCircle className="w-4 h-4" />
                    {generatingExam ? 'Generando examen...' : 'Iniciar examen'}
                  </button>
                  {configSaved && (
                    <p className="text-sm font-medium text-green-700">
                      Configuracion lista para iniciar el examen.
                    </p>
                  )}
                </div>
              </form>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Documentos disponibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.length === 0 ? (
                <div className="card">
                  <p className="text-sm text-gray-600">No hay documentos subidos.</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`card text-left transition-colors ${
                      selectedDocId === doc.id ? 'border-primary-400 bg-primary-50' : 'hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                        <p className="text-sm text-gray-500">{doc.originalFilename}</p>
                        <p className="mt-1 text-xs text-gray-500">{doc.status}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        doc.status === 'indexed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
            {documents.length > 0 && !documents.some((doc) => doc.id === selectedDocId && doc.status === 'indexed') && (
              <p className="mt-3 text-sm text-orange-700">
                Selecciona un documento indexado para poder generar el examen.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="stat-card bg-gradient-to-br from-purple-50 to-white border-purple-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{recentAttempts.length || 47}</p>
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
                  <p className="text-2xl font-bold text-gray-900">
                    {recentAttempts[0]?.score ?? 83}%
                  </p>
                  <p className="text-sm text-gray-600">Latest Score</p>
                </div>
              </div>
            </div>

            <div className="stat-card bg-gradient-to-br from-green-50 to-white border-green-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {recentAttempts[0] ? formatTime(recentAttempts[0].timeTakenSeconds) : '15m'}
                  </p>
                  <p className="text-sm text-gray-600">Latest Time</p>
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
                  <button className="btn-primary w-full" onClick={handleStartExam}>
                    Start Quiz
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Quiz Results</h2>
            {recentAttempts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <p className="text-gray-600">No exam attempts yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-1 items-center gap-3">
                        <FileText className="w-5 h-5 text-primary-500" />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Exam Attempt</h3>
                          <p className="text-sm text-gray-500">
                            {attempt.totalQuestions} questions | {attempt.correctAnswers} correct |{' '}
                            {attempt.submittedAt?.includes('T')
                              ? new Date(attempt.submittedAt).toLocaleString()
                              : attempt.submittedAt}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${
                          attempt.score >= 80 ? 'text-green-600' : attempt.score >= 60 ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          {attempt.score}%
                        </p>
                        <p className="text-sm text-gray-500">Score</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuizMode
