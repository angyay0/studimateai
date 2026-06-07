import { Link } from 'react-router-dom'
import { Upload, Target, TrendingUp, BookOpen, Sparkles, ChevronRight, Play } from 'lucide-react'
import Navbar from '../components/Navbar'

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      <Navbar isLanding={true} />
      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        <div className="absolute top-20 left-10 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        
        <div className="text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-primary-200 mb-8">
            <Sparkles className="w-4 h-4 text-primary-600" />
            <span className="text-primary-700 font-medium">AI-powered study companion</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6">
            Study Smarter, <br />
            <span className="text-primary-600 relative">
              Not Harder
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 400 12" fill="none">
                <path d="M2 10C133.333 3.33333 266.667 3.33333 398 10" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Upload your PDFs, textbooks, and notes. StudiMate AI generates personalized 
            quizzes, summaries, and explanations — so you study what matters and ace your exams.
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-8">
            <Link to="/login" className="btn-primary text-lg">
              <Upload className="w-5 h-5" />
              Upload your first PDF — it's free
            </Link>
            <button className="btn-secondary text-lg">
              <Play className="w-5 h-5" />
              Watch demo
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Free 14-day trial</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-600 font-semibold mb-2 uppercase tracking-wide">FEATURES</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything you need to study better
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built for students who want to learn deeply, not just memorize. StudiMate adapts to how you think.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-3xl p-8 border border-purple-100">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <Upload className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Upload Any Material</h3>
              <p className="text-gray-600 mb-4">
                Drag and drop PDFs, textbooks, notes, and slides. StudiMate reads everything instantly.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-white rounded-3xl p-8 border border-red-100">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">AI-Powered Quizzes</h3>
              <p className="text-gray-600 mb-4">
                Our AI extracts key concepts and generates personalized multiple-choice, true/false, and open-ended questions.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-white rounded-3xl p-8 border border-yellow-100">
              <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center mb-6">
                <BookOpen className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Exam Simulation</h3>
              <p className="text-gray-600 mb-4">
                Practice in a timed exam environment. Get instant feedback and see where you need to improve.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 border border-blue-100">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Track Progress</h3>
              <p className="text-gray-600 mb-4">
                Visual analytics show your mastery per topic, performance trends, and study streaks.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-primary-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-6">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to transform how you study?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join 50,000+ students already using StudiMate AI to cut their study time in half and double their retention.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-4 px-8 rounded-xl text-lg transition-colors">
            Start for free — no card needed
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                StudiMate <span className="text-primary-400">AI</span>
              </span>
            </div>
            <p className="text-sm">© 2026 StudiMate AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
