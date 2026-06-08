import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, Target, TrendingUp, Award, Settings, Sparkles, LogOut } from 'lucide-react'
import { authAPI } from '../services/api'
import { useEffect, useState } from 'react'

function Sidebar({ onLogout }) {
  const location = useLocation()
  const [user, setUser] = useState(null)
  
  useEffect(() => {
    const currentUser = authAPI.getCurrentUser()
    setUser(currentUser)
  }, [])
  
  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/upload', icon: FileText, label: 'My Documents' },
    { path: '/quiz-mode', icon: Target, label: 'Quizzes' },
    { path: '/progress', icon: TrendingUp, label: 'Progress' },
    { path: '/achievements', icon: Award, label: 'Achievements' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ]
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">
            StudiMate <span className="text-primary-600">AI</span>
          </span>
        </Link>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      
      {user && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user.name?.charAt(0) || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user.name || 'Maria G.'}</p>
              <p className="text-sm text-gray-600">{user.plan || 'Free plan'}</p>
            </div>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Sidebar
