import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, ChevronRight, RotateCcw } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { quizzesAPI } from '../services/api'

function TakeQuiz({ onLogout }) {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [revealedAnswers, setRevealedAnswers] = useState({})

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    try {
      const quizzes = await quizzesAPI.getUpcoming()
      console.log('Loaded quizzes:', quizzes)
      if (quizzes.length > 0 && quizzes[0].questions) {
        console.log('Questions:', quizzes[0].questions)
        setQuestions(quizzes[0].questions)
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion = questions[currentIndex]

  const handleAnswer = (answer) => {
    setAnswers({ ...answers, [currentIndex]: answer })
  }

  const handleRevealAnswer = () => {
    setRevealedAnswers({ ...revealedAnswers, [currentIndex]: true })
    // Auto-set the correct answer when revealed
    setAnswers({ ...answers, [currentIndex]: currentQuestion.correctAnswer })
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setShowResults(true)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const calculateScore = () => {
    let correct = 0
    questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correct++
      }
    })
    return Math.round((correct / questions.length) * 100)
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setAnswers({})
    setShowResults(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-screen">
        <Sidebar onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Questions Available</h2>
            <p className="text-gray-600 mb-6">Generate questions from your documents first.</p>
            <button onClick={() => navigate('/upload')} className="btn-primary">
              Upload Documents
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showResults) {
    const score = calculateScore()
    return (
      <div className="flex h-screen">
        <Sidebar onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
              score >= 70 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {score >= 70 ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
            <p className="text-6xl font-bold text-primary-600 mb-6">{score}%</p>
            <p className="text-gray-600 mb-8">
              You answered {Object.values(answers).filter((a, i) => a === questions[i].correctAnswer).length} out of {questions.length} questions correctly
            </p>
            <div className="flex gap-4 justify-center">
              <button onClick={handleRestart} className="btn-secondary inline-flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Try Again
              </button>
              <button onClick={() => navigate('/quiz-mode')} className="btn-primary">
                Back to Quizzes
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar onLogout={onLogout} />
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-4xl mx-auto p-8">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-sm font-medium text-gray-600">
                {Math.round(((currentIndex + 1) / questions.length) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
                {currentQuestion.type || 'Multiple Choice'}
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options && currentQuestion.options.length > 0 ? (
                currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      answers[currentIndex] === option
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        answers[currentIndex] === option
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentIndex] === option && (
                          <div className="w-3 h-3 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-gray-900">{option}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div 
                  onClick={!revealedAnswers[currentIndex] ? handleRevealAnswer : undefined}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    revealedAnswers[currentIndex]
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200 cursor-pointer hover:border-yellow-300 hover:bg-yellow-100'
                  }`}
                >
                  {revealedAnswers[currentIndex] ? (
                    <>
                      <p className="text-sm text-green-800 mb-2">
                        ✓ Answer revealed
                      </p>
                      <p className="text-lg font-semibold text-green-900">
                        {currentQuestion.correctAnswer}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-yellow-800 mb-2">
                        No options available for this question
                      </p>
                      <p className="text-xs text-yellow-700 font-medium">
                        👆 Click here to reveal the answer
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!answers[currentIndex] && currentQuestion.options && currentQuestion.options.length > 0}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TakeQuiz
