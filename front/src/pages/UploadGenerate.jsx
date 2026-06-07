import { useState, useEffect, useCallback } from 'react'
import { Upload, FileText, Trash2, Sparkles, HelpCircle } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { documentsAPI, quizzesAPI } from '../services/api'

function UploadGenerate({ onLogout }) {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [quizConfig, setQuizConfig] = useState({
    questionCount: 20,
    difficulty: 'Mixed',
    questionTypes: ['Multiple Choice', 'True / False'],
    focusTopic: ''
  })

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await documentsAPI.getAll()
      setDocuments(docs)
      if (docs.length > 0 && !selectedDoc) {
        setSelectedDoc(docs[0])
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }, [selectedDoc])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0])
    }
  }

  const handleFileUpload = async (file) => {
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx') && !file.name.endsWith('.txt')) {
      alert('Please upload a PDF, DOCX, or TXT file')
      return
    }

    setUploading(true)
    try {
      const newDoc = await documentsAPI.upload(file, {})
      setDocuments([newDoc, ...documents])
      setSelectedDoc(newDoc)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleGenerateQuiz = async () => {
    if (!selectedDoc) {
      alert('Please select a document first')
      return
    }

    setGenerating(true)
    try {
      const quiz = await quizzesAPI.generate(selectedDoc.id, quizConfig)
      alert(`Quiz generated successfully with ${quiz.questions.length} questions!`)
    } catch (error) {
      console.error('Error generating quiz:', error)
      alert('Failed to generate quiz')
    } finally {
      setGenerating(false)
    }
  }

  const toggleQuestionType = (type) => {
    if (quizConfig.questionTypes.includes(type)) {
      if (quizConfig.questionTypes.length > 1) {
        setQuizConfig({
          ...quizConfig,
          questionTypes: quizConfig.questionTypes.filter(t => t !== type)
        })
      }
    } else {
      setQuizConfig({
        ...quizConfig,
        questionTypes: [...quizConfig.questionTypes, type]
      })
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={onLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-6 h-6 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Upload & Generate</h1>
            </div>
            <p className="text-gray-600">Upload a PDF to generate a personalized quiz</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragActive 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-300 bg-white hover:border-primary-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {uploading ? 'Uploading...' : 'Drag & drop your PDF here'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">or click to browse files</p>
                <label className="btn-primary cursor-pointer inline-flex">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileInput}
                    disabled={uploading}
                  />
                  Choose File
                </label>
                <p className="text-xs text-gray-400 mt-4">PDF, DOCX, TXT · Max 50 MB</p>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-4">YOUR DOCUMENTS</h3>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`p-4 rounded-xl cursor-pointer transition-all ${
                        selectedDoc?.id === doc.id
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'bg-white border border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-2xl">{doc.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                            <p className="text-xs text-gray-500">{doc.pages} pages · {doc.uploadedAt}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDocuments(documents.filter(d => d.id !== doc.id))
                            if (selectedDoc?.id === doc.id) {
                              setSelectedDoc(documents[0])
                            }
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedDoc ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedDoc.title}</h2>
                      <p className="text-gray-600">{selectedDoc.pages} pages · Configure your quiz below</p>
                    </div>
                    <button className="btn-primary" onClick={handleGenerateQuiz} disabled={generating}>
                      <Sparkles className="w-5 h-5" />
                      {generating ? 'Generating...' : 'Ready to generate'}
                    </button>
                  </div>

                  <div className="bg-purple-50 rounded-xl p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-gray-900">Quiz Configuration</h3>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="font-medium text-gray-900">Number of Questions</label>
                          <span className="text-primary-600 font-bold">{quizConfig.questionCount}</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          value={quizConfig.questionCount}
                          onChange={(e) => setQuizConfig({ ...quizConfig, questionCount: parseInt(e.target.value) })}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>5 (quick review)</span>
                          <span>50 (full exam)</span>
                        </div>
                      </div>

                      <div>
                        <label className="font-medium text-gray-900 mb-3 block">Difficulty Level</label>
                        <div className="grid grid-cols-4 gap-3">
                          {['Easy', 'Medium', 'Hard', 'Mixed'].map((level) => (
                            <button
                              key={level}
                              onClick={() => setQuizConfig({ ...quizConfig, difficulty: level })}
                              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                                quizConfig.difficulty === level
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:border-primary-400'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="font-medium text-gray-900 mb-3 block">Question Types</label>
                        <div className="grid grid-cols-2 gap-3">
                          {['Multiple Choice', 'True / False', 'Fill in the blank', 'Open-ended'].map((type) => (
                            <button
                              key={type}
                              onClick={() => toggleQuestionType(type)}
                              className={`py-3 px-4 rounded-lg font-medium transition-all text-left ${
                                quizConfig.questionTypes.includes(type)
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:border-primary-400'
                              }`}
                            >
                              <span className="mr-2">
                                {quizConfig.questionTypes.includes(type) ? '✓' : '○'}
                              </span>
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <label className="font-medium text-gray-900">Focus Topic (optional)</label>
                          <HelpCircle className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={quizConfig.focusTopic}
                          onChange={(e) => setQuizConfig({ ...quizConfig, focusTopic: e.target.value })}
                          placeholder="e.g. Mitosis and Meiosis, Chapter 5..."
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm text-blue-900">
                      💡 <strong>Tip:</strong> For best results, use documents with clear headings and structured content. 
                      The AI will extract key concepts and generate questions based on the most important topics.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No document selected</h3>
                  <p className="text-gray-600">Upload a document or select one from your library to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadGenerate
