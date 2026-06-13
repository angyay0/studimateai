import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Target, Clock, Star, Upload, ChevronRight, Flame, FileText } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { statsAPI, documentsAPI, quizzesAPI, authAPI } from '../services/api'

function Dashboard({ onLogout }) {
  const [stats, setStats] = useState(null)
  const [documents, setDocuments] = useState([])
  const [upcomingQuizzes, setUpcomingQuizzes] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    const currentUser = authAPI.getCurrentUser()
    setUser(currentUser)

    try {
      const [statsData, docsData, quizzesData] = await Promise.all([
        statsAPI.getDashboard(),
        documentsAPI.getAll(),
        quizzesAPI.getUpcoming()
      ])

      if (statsData) {
        setStats(statsData)
      }

      if (docsData) {
        setDocuments(docsData.slice(0, 3))

      } else {
        setDocuments([])
      }

      if (quizzesData) {
        setUpcomingQuizzes(quizzesData)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
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
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-gray-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <h1 className="text-3xl font-bold text-gray-900">
                  {getGreeting()}, {user?.name || user?.firstName || 'friend'}! 👋
                </h1>
              </div>
              <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full border border-orange-200">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-bold text-orange-600">14-day streak!</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary-600" />
                </div>
                <span className="text-sm text-gray-500">{stats?.quizzesChange}</span>
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1">{stats?.quizzesTaken}</p>
              <p className="text-gray-600">Quizzes Taken</p>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-sm text-gray-500">{stats?.scoreChange}</span>
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1">{stats?.avgScore}%</p>
              <p className="text-gray-600">Avg. Score</p>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">{stats?.hoursChange}</span>
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1">{stats?.hoursStudied}h</p>
              <p className="text-gray-600">Hours Studied</p>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="text-sm text-gray-500">{stats?.topicsChange}</span>
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1">{stats?.topicsMastered}</p>
              <p className="text-gray-600">Topics Mastered</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Documents</h2>
                <Link to="/upload" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-4">
                {documents.length == 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-gray-700">No hay documentos reales aun</p>
                    </div>
                    <Link to="/upload" className="w-full flex items-center justify-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-primary-700 font-medium hover:bg-primary-100 transition-colors">
                      <Upload className="w-4 h-4" />
                      Upload new document
                    </Link>
                  </div>
                )}

                {documents.length > 0 && documents.map((doc) => (
                    <div key={doc.id} className="card hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-primary-500" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {doc.status === 'indexed' ? 'Listo' :
                               doc.status === 'processing' || doc.status === 'indexing' ? 'Procesando...' :
                               doc.status === 'error' || doc.status === 'failed' ? 'Error al procesar' :
                               doc.status}
                            </p>
                          </div>
                        </div>
                        <Link to="/quiz-mode" className="btn-primary shrink-0">
                          <Target className="w-4 h-4" />
                          Quiz me
                        </Link>
                      </div>
                    </div>
                  ))}

                {documents.length > 0 && (
                  <Link to="/upload" className="mt-2 card border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50/50 transition-all cursor-pointer">
                    <div className="flex items-center justify-center gap-3 py-4">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600 font-medium">Upload new document</span>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Quizzes</h2>
              <div className="space-y-4">
                {upcomingQuizzes.map((quiz) => (
                  <div key={quiz.id} className="card">
                    <h3 className="font-semibold text-gray-900 mb-2">{quiz.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{quiz.time}</p>
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        quiz.difficulty === 'Medium' 
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {quiz.difficulty}
                      </span>
                      <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                        Start quiz →
                      </button>
                    </div>
                  </div>
                ))}

                <div className="card bg-gradient-to-br from-primary-50 to-purple-50 border-primary-200">
                  <p className="text-sm text-gray-700 mb-3">
                    🎯 You are on track! Keep up the momentum.
                  </p>
                  <Link to="/progress" className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1">
                    View detailed progress
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
