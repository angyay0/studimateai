import { useState, useEffect } from 'react'
import { Target, Clock, Award, ChevronRight } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { quizzesAPI } from '../services/api'

function QuizMode() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuizzes()
  }, [])

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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-6 h-6 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Quiz Mode</h1>
            </div>
            <p className="text-gray-600">Practice with AI-generated quizzes and track your progress</p>
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
