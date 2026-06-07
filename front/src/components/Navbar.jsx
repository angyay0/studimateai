import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

function Navbar({ isLanding = false }) {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">
              StudiMate <span className="text-primary-600">AI</span>
            </span>
          </Link>
          
          {isLanding && (
            <div className="flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium">
                How it works
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">
                Pricing
              </a>
              <a href="#schools" className="text-gray-600 hover:text-gray-900 font-medium">
                For Schools
              </a>
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-gray-700 hover:text-gray-900 font-medium">
                  Log in
                </Link>
                <Link to="/login" className="btn-primary">
                  Get started
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
