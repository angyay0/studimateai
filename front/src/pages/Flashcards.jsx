import { useState, useEffect } from 'react'
import { Brain, Plus, Trash2, FileText, Calendar, BarChart3 } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { flashcardsAPI, documentsAPI } from '../services/api'

function Flashcards({ onLogout }) {
  const [documents, setDocuments] = useState([])
  const [flashcards, setFlashcards] = useState([])
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dueCount, setDueCount] = useState(0)
  const [flashcardConfig, setFlashcardConfig] = useState({
    count: 10,
    type: 'concept'
  })

  useEffect(() => {
    loadData()
  }, [])
  
  // Poll only if there are processing documents
  useEffect(() => {
    const hasProcessingDocs = documents.some(d => 
      d.status === 'processing' || d.status === 'indexing' || d.status === 'uploaded'
    )
    
    if (!hasProcessingDocs) {
      return
    }
    
    // Poll every 5 seconds only when documents are processing
    const interval = setInterval(() => {
      loadData()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [documents])

  const loadData = async () => {
    try {
      const isInitialLoad = loading
      if (isInitialLoad) setLoading(true)
      
      const [docsData, cardsData, count] = await Promise.all([
        documentsAPI.getAll(),
        flashcardsAPI.getAll(),
        flashcardsAPI.getDueCount(),
      ])
      
      // Show all documents but only allow generating from indexed ones
      setDocuments(docsData)
      setFlashcards(cardsData)
      setDueCount(count)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      if (loading) setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedDocument || generating) return

    try {
      setGenerating(true)
      const result = await flashcardsAPI.generate(selectedDocument, flashcardConfig)
      alert(`Successfully generated ${result.count} flashcards!`)
      loadData()
      setSelectedDocument(null)
    } catch (error) {
      console.error('Error generating flashcards:', error)
      const message = error.message || 'Failed to generate flashcards'
      alert(message)
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (documentId) => {
    if (!confirm('Are you sure you want to delete all flashcards for this document?')) return

    try {
      const count = await flashcardsAPI.deleteForDocument(documentId)
      alert(`Deleted ${count} flashcard${count !== 1 ? 's' : ''}`)
      loadData()
    } catch (error) {
      console.error('Error deleting flashcards:', error)
      alert('Failed to delete flashcards')
    }
  }

  // Group flashcards by document
  const flashcardsByDocument = flashcards.reduce((acc, card) => {
    if (!acc[card.documentId]) {
      acc[card.documentId] = []
    }
    acc[card.documentId].push(card)
    return acc
  }, {})

  // Get document info for each group
  const flashcardGroups = Object.entries(flashcardsByDocument).map(([docId, cards]) => {
    const doc = documents.find(d => d.id === docId)
    return {
      documentId: docId,
      documentName: doc?.originalFilename || 'Unknown Document',
      cards,
      dueCards: cards.filter(c => new Date(c.nextReviewAt) <= new Date()).length,
    }
  })

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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={onLogout} />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Flashcards</h1>
            </div>
            <a
              href="/flashcards/review"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Brain className="w-5 h-5" />
              Review ({dueCount} due)
            </a>
          </div>
          <p className="text-gray-600">
            Generate and review flashcards from your documents using spaced repetition
          </p>
        </div>

        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <Brain className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Flashcards</p>
                  <p className="text-2xl font-bold text-gray-900">{flashcards.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Today</p>
                  <p className="text-2xl font-bold text-gray-900">{dueCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Documents</p>
                  <p className="text-2xl font-bold text-gray-900">{flashcardGroups.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate New Flashcards</h2>
            
            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Flashcards
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={flashcardConfig.count}
                  onChange={(e) => setFlashcardConfig({ ...flashcardConfig, count: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={generating}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flashcard Type
                </label>
                <select
                  value={flashcardConfig.type}
                  onChange={(e) => setFlashcardConfig({ ...flashcardConfig, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={generating}
                >
                  <option value="concept">Concept (Q&A)</option>
                  <option value="true_false">True/False</option>
                  <option value="multiple_choice">Multiple Choice</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document
                </label>
                <select
                  value={selectedDocument || ''}
                  onChange={(e) => setSelectedDocument(e.target.value || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={generating}
                >
                  <option value="">Select a document...</option>
                  {documents
                    .filter(doc => !flashcardsByDocument[doc.id])
                    .map(doc => (
                      <option 
                        key={doc.id} 
                        value={doc.id}
                        disabled={doc.status !== 'indexed'}
                      >
                        {doc.originalFilename} {doc.status !== 'indexed' ? `(${doc.status})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={!selectedDocument || generating}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Generate {flashcardConfig.count} {flashcardConfig.type.replace('_', ' ')} Flashcards
                </>
              )}
            </button>
            {documents.filter(doc => !flashcardsByDocument[doc.id]).length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                All indexed documents already have flashcards. Upload more documents or delete existing flashcards to generate new ones.
              </p>
            )}
            {documents.filter(doc => doc.status !== 'indexed' && !flashcardsByDocument[doc.id]).length > 0 && (
              <p className="text-sm text-yellow-600 mt-2 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                {documents.filter(doc => doc.status !== 'indexed').length} document(s) still processing. They will appear here once indexed.
              </p>
            )}
          </div>

          {/* Flashcard Groups */}
          {flashcardGroups.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Flashcards Yet</h3>
              <p className="text-gray-600 mb-6">
                Generate flashcards from your documents to start studying with spaced repetition
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {flashcardGroups.map(group => (
                <div key={group.documentId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{group.documentName}</h3>
                    </div>
                    <button
                      onClick={() => handleDelete(group.documentId)}
                      className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete all flashcards"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                    <span>{group.cards.length} cards</span>
                    {group.dueCards > 0 && (
                      <span className="text-yellow-600 font-medium">
                        {group.dueCards} due for review
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.cards.slice(0, 4).map(card => (
                      <div key={card.id} className="border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-900 mb-2">{card.question}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{card.answer}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <span>Reviewed {card.reviewCount} times</span>
                          {new Date(card.nextReviewAt) <= new Date() && (
                            <span className="text-yellow-600 font-medium">• Due now</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {group.cards.length > 4 && (
                    <p className="text-sm text-gray-500 mt-4">
                      + {group.cards.length - 4} more cards
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Flashcards
