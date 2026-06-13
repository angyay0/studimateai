import { useState, useEffect } from 'react'
import { MessageCircle, Send, FileText, Loader } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { documentsAPI } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const getAuthToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken')

function RAGQuery({ onLogout }) {
  const [documents, setDocuments] = useState([])
  const [selectedDocs, setSelectedDocs] = useState([])
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const docs = await documentsAPI.getAll()
      setDocuments(docs.filter(d => d.status === 'indexed'))
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const toggleDocument = (docId) => {
    if (selectedDocs.includes(docId)) {
      setSelectedDocs(selectedDocs.filter(id => id !== docId))
    } else {
      setSelectedDocs([...selectedDocs, docId])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    const userMessage = { role: 'user', content: query }
    setMessages([...messages, userMessage])
    setQuery('')
    setLoading(true)

    try {
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/api/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: userMessage.content,
          documentIds: selectedDocs.length > 0 ? selectedDocs : undefined,
          topK: 5
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to query documents')
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.answer,
        citations: data.citations
      }

      setMessages([...messages, userMessage, assistantMessage])
    } catch (error) {
      console.error('Error querying documents:', error)
      const errorMessage = {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor intenta de nuevo.',
        error: true
      }
      setMessages([...messages, userMessage, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={onLogout} />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-6 h-6 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Ask Your Documents</h1>
          </div>
          <p className="text-gray-600">Get answers based on your uploaded documents</p>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Select Documents</h3>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => toggleDocument(doc.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedDocs.includes(doc.id)
                      ? 'bg-primary-50 border-2 border-primary-500'
                      : 'bg-gray-50 border border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{doc.title}</p>
                      <p className="text-xs text-gray-500">{doc.uploadedAt}</p>
                    </div>
                    {selectedDocs.includes(doc.id) && (
                      <span className="text-primary-600 font-bold">✓</span>
                    )}
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  No indexed documents available. Upload and index documents first.
                </p>
              )}
            </div>
            {selectedDocs.length === 0 && documents.length > 0 && (
              <p className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 rounded-lg">
                💡 No documents selected. Questions will be answered using all indexed documents.
              </p>
            )}
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Start a Conversation</h3>
                  <p className="text-gray-600">Ask questions about your documents and get instant answers</p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : message.error
                        ? 'bg-red-50 text-red-900 border border-red-200'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Sources:</p>
                        {message.citations.map((citation, i) => (
                          <p key={i} className="text-xs text-gray-500 mb-1">
                            {citation.content || `Citation ${i + 1}`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <Loader className="w-5 h-5 text-primary-600 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-6 bg-white">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about your documents..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="btn-primary px-6"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RAGQuery
