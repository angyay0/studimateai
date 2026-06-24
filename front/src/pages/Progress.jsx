import { useState, useEffect } from 'react'
import { TrendingUp, Award, Flame, Target } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { statsAPI } from '../services/api'

function Progress({ onLogout }) {
  const [progressData, setProgressData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProgress()
  }, [])

  const loadProgress = async () => {
    try {
      const data = await statsAPI.getProgress()
      setProgressData(data)
    } catch (error) {
      console.error('Error loading progress:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your progress...</p>
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
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Progress</h1>
            </div>
            <p className="text-gray-600">Track your learning journey and achievements</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="stat-card bg-gradient-to-br from-orange-50 to-white border-orange-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{progressData?.studyStreak}</p>
                  <p className="text-sm text-gray-600">Day Streak</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {progressData?.studyStreak > 0 ? 'Actividad reciente registrada' : 'Sin actividad reciente'}
              </p>
            </div>

            <div className="stat-card bg-gradient-to-br from-green-50 to-white border-green-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{progressData?.documentsPracticed || 0}</p>
                  <p className="text-sm text-gray-600">Documents Practiced</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Derived from exam history</p>
            </div>

            <div className="stat-card bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{progressData?.overallScore || 0}%</p>
                  <p className="text-sm text-gray-600">Overall Score</p>
                </div>
              </div>
              <p className="text-xs text-green-600">
                {progressData?.attemptCount ? `${progressData.attemptCount} attempts total` : 'No attempts yet'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Weekly Performance</h2>
              <div className="space-y-4">
                {progressData?.weeklyScores.map((score, index) => {
                  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{days[index]}</span>
                        <span className="text-sm font-bold text-gray-900">{score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Topic Mastery</h2>
              <div className="space-y-4">
                {progressData?.topicMastery.map((topic, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{topic.topic}</span>
                      <span className="text-sm font-bold text-gray-900">{topic.mastery}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          topic.mastery >= 80 ? 'bg-green-500' : topic.mastery >= 60 ? 'bg-blue-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${topic.mastery}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Achievements</h2>
            {progressData?.attemptCount ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'First Exam Completed',
                    description: 'You have at least one recorded attempt.',
                    date: 'Recorded'
                  },
                  {
                    title: `${progressData.studyStreak} Day Streak`,
                    description: 'Recent study activity was detected.',
                    date: 'Current streak'
                  },
                  {
                    title: 'Document Practice',
                    description: `${progressData.documentsPracticed} documents have been used for exams.`,
                    date: 'From backend data'
                  }
                ].map((achievement, index) => (
                  <div key={index} className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-xl p-6 border border-primary-100">
                    <div className="text-4xl mb-3">★</div>
                    <h3 className="font-bold text-gray-900 mb-1">{achievement.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                    <p className="text-xs text-gray-500">{achievement.date}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-gray-600">No exam activity yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Progress
