import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Target, Clock, Star, Upload, ChevronRight, Flame } from 'lucide-react'
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
    try {
      const [statsData, docsData, quizzesData] = await Promise.all([
        statsAPI.getDashboard(),
        documentsAPI.getAll(),
        quizzesAPI.getUpcoming()
      ])
      
      setStats(statsData)
      setDocuments(docsData.slice(0, 3))
      setUpcomingQuizzes(quizzesData)
      setUser(authAPI.getCurrentUser())
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
                  {getGreeting()}, {user?.name || 'Maria'}! 👋
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
                {documents.map((doc) => (
                  <div key={doc.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-2xl">
                          {doc.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                          <p className="text-sm text-gray-500">
                            {doc.pages} pages · {doc.quizzes} quizzes · {doc.uploadedAt}
                          </p>
                        </div>
                      </div>
                      <button className="btn-primary">
                        <Target className="w-4 h-4" />
                        Quiz me
                      </button>
                    </div>
                  </div>
                ))}

                <Link to="/upload" className="card border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50/50 transition-all cursor-pointer">
                  <div className="flex items-center justify-center gap-3 py-4">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600 font-medium">Upload new document</span>
                  </div>
                </Link>
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
