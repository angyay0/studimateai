import { useState, useEffect } from 'react'
import { Brain, RotateCcw, CheckCircle, XCircle, Zap } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { flashcardsAPI } from '../services/api'

function FlashcardReview({ onLogout }) {
  const [flashcards, setFlashcards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [stats, setStats] = useState({ reviewed: 0, total: 0 })

  useEffect(() => {
    loadDueFlashcards()
  }, [])

  const loadDueFlashcards = async () => {
    try {
      setLoading(true)
      const cards = await flashcardsAPI.getDue()
      setFlashcards(cards)
      setStats({ reviewed: 0, total: cards.length })
    } catch (error) {
      console.error('Error loading flashcards:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleReview = async (rating) => {
    if (reviewing || currentIndex >= flashcards.length) return

    try {
      setReviewing(true)
      const currentCard = flashcards[currentIndex]
      
      await flashcardsAPI.review(currentCard.id, rating)
      
      setStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }))
      
      // Move to next card
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setIsFlipped(false)
      } else {
        // All cards reviewed
        setCurrentIndex(flashcards.length)
      }
    } catch (error) {
      console.error('Error reviewing flashcard:', error)
      alert('Failed to save review. Please try again.')
    } finally {
      setReviewing(false)
    }
  }

  const handleRestart = () => {
    loadDueFlashcards()
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading flashcards...</p>
          </div>
        </div>
      </div>
    )
  }

  const currentCard = flashcards[currentIndex]
  const isComplete = currentIndex >= flashcards.length

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={onLogout} />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Flashcard Review</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-2xl font-bold text-primary-600">
                {stats.reviewed} / {stats.total}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          {flashcards.length === 0 ? (
            <div className="text-center max-w-md">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
              <p className="text-gray-600 mb-6">
                You have no flashcards due for review today. Great job!
              </p>
              <button
                onClick={() => window.location.href = '/flashcards'}
                className="btn-primary"
              >
                View All Flashcards
              </button>
            </div>
          ) : isComplete ? (
            <div className="text-center max-w-md">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Complete!</h2>
              <p className="text-gray-600 mb-6">
                You've reviewed {stats.reviewed} flashcard{stats.reviewed !== 1 ? 's' : ''} today.
                Keep up the great work!
              </p>
              <button
                onClick={handleRestart}
                className="btn-primary inline-flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Review Again
              </button>
            </div>
          ) : (
            <div className="w-full max-w-2xl">
              {/* Flashcard */}
              <div
                className="relative w-full h-96 cursor-pointer"
                onClick={handleFlip}
              >
                {/* Front */}
                <div
                  className={`absolute inset-0 bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 flex flex-col items-center justify-center transition-opacity duration-300 ${
                    isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <p className="text-sm font-semibold text-primary-600 mb-4">QUESTION</p>
                  <p className="text-2xl font-medium text-gray-900 text-center">
                    {currentCard?.question}
                  </p>
                  <p className="text-sm text-gray-500 mt-8">Click to reveal answer</p>
                </div>

                {/* Back */}
                <div
                  className={`absolute inset-0 bg-primary-50 rounded-2xl shadow-xl border-2 border-primary-200 p-8 flex flex-col items-center justify-center transition-opacity duration-300 ${
                    isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <p className="text-sm font-semibold text-primary-600 mb-4">ANSWER</p>
                  <p className="text-xl text-gray-900 text-center whitespace-pre-wrap">
                    {currentCard?.answer}
                  </p>
                </div>
              </div>

              {/* Rating Buttons */}
              {isFlipped && (
                <div className="mt-8 flex gap-4 justify-center">
                  <button
                    onClick={() => handleReview('difficult')}
                    disabled={reviewing}
                    className="flex-1 max-w-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Difficult
                  </button>
                  <button
                    onClick={() => handleReview('good')}
                    disabled={reviewing}
                    className="flex-1 max-w-xs bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Good
                  </button>
                  <button
                    onClick={() => handleReview('easy')}
                    disabled={reviewing}
                    className="flex-1 max-w-xs bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    Easy
                  </button>
                </div>
              )}

              {/* Progress Bar */}
              <div className="mt-8">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(stats.reviewed / stats.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-center text-sm text-gray-600 mt-2">
                  Card {currentIndex + 1} of {stats.total}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FlashcardReview
