import { useState, useEffect, useCallback } from 'react'
import { Upload, FileText, Trash2, Sparkles, HelpCircle, AlertCircle, CheckCircle } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { documentsAPI, quizzesAPI } from '../services/api'

function UploadGenerate({ onLogout }) {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [quizConfig, setQuizConfig] = useState({
    questionCount: 20,
    difficulty: 'Mixed',
    questionTypes: ['Multiple Choice', 'True / False'],
    focusTopic: ''
  })

  const loadDocuments = useCallback(async (preferredDocId = null) => {
    try {
      const docs = await documentsAPI.getAll()
      setDocuments(docs)
      if (preferredDocId) {
        const preferredDoc = docs.find((doc) => doc.id === preferredDocId)
        if (preferredDoc) {
          setSelectedDoc(preferredDoc)
          return docs
        }
      }
      if (!selectedDoc) {
        const indexedDoc = docs.find((doc) => doc.status === 'indexed')
        setSelectedDoc(indexedDoc || docs[0] || null)
      }
      return docs
    } catch (error) {
      console.error('Error loading documents:', error)
      return []
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
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Solo se aceptan archivos PDF.')
      return
    }
    const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
    if (file.size > MAX_SIZE) {
      setUploadError('El archivo supera el tamaño máximo de 20 MB.')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const newDoc = await documentsAPI.upload(file, (percent) => {
        setUploadProgress(percent)
      })
      await loadDocuments(newDoc.id)
      setUploadSuccess(`"${newDoc.originalName ?? file.name}" subido correctamente.`)
      setUploadProgress(100)
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadError(error.message || 'Error al subir el archivo. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (e, docId) => {
    e.stopPropagation()
    try {
      await documentsAPI.delete(docId)
      const remaining = documents.filter(d => d.id !== docId)
      setDocuments(remaining)
      if (selectedDoc?.id === docId) {
        setSelectedDoc(remaining[0] ?? null)
      }
    } catch (error) {
      setUploadError(error.message || 'Error al eliminar el documento.')
    }
  }

  const handleGenerateQuiz = async () => {
    if (!selectedDoc) {
      setUploadError('Selecciona un documento primero.')
      return
    }

    setGenerating(true)
    try {
      const docs = await loadDocuments(selectedDoc.id)
      const refreshedDoc = docs.find((doc) => doc.id === selectedDoc.id)

      if (!refreshedDoc) {
        setUploadError('El documento seleccionado ya no está disponible.')
        return
      }

      if (refreshedDoc.status !== 'indexed') {
        setUploadError('Este documento aún se está indexando. Espera a que termine el procesamiento antes de generar el examen.')
        setSelectedDoc(refreshedDoc)
        return
      }

      setSelectedDoc(refreshedDoc)
      const quiz = await quizzesAPI.generate(refreshedDoc.id, quizConfig)
      alert(`¡Quiz generado con ${quiz.questions.length} preguntas!`)
    } catch (error) {
      console.error('Error generating quiz:', error)
      setUploadError(error.message || 'Error al generar el quiz.')
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
              <h1 className="text-3xl font-bold text-gray-900">Upload &amp; Generate</h1>
            </div>
            <p className="text-gray-600">Sube un PDF para generar un quiz personalizado</p>
          </div>

          {/* Notificación de error */}
          {uploadError && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="text-sm">{uploadError}</span>
              <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setUploadError(null)}>✕</button>
            </div>
          )}

          {/* Notificación de éxito */}
          {uploadSuccess && (
            <div className="mb-6 flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">
              <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="text-sm">{uploadSuccess}</span>
              <button className="ml-auto text-green-400 hover:text-green-600" onClick={() => setUploadSuccess(null)}>✕</button>
            </div>
          )}

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
                  {uploading ? 'Subiendo...' : 'Arrastra tu PDF aquí'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">o haz clic para elegir un archivo</p>

                {/* Barra de progreso (solo visible al subir) */}
                {uploading && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Subiendo archivo...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <label className={`btn-primary cursor-pointer inline-flex ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={handleFileInput}
                    disabled={uploading}
                  />
                  Elegir archivo
                </label>
                <p className="text-xs text-gray-400 mt-4">Solo PDF · Máx 20 MB</p>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-4">TUS DOCUMENTOS</h3>
                {documents.length == 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <p className="text-sm text-gray-400 text-center py-2">Aun no has subido ningun documento.</p>
                  </div>
                )}
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
                          <FileText className="w-6 h-6 text-primary-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{doc.originalName ?? doc.title}</p>
                            <p className="text-xs text-gray-500">
                              {doc.pageCount ? `${doc.pageCount} páginas · ` : ''}
                              {doc.status}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteDocument(e, doc.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                          title="Eliminar documento"
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
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedDoc.originalName ?? selectedDoc.title}</h2>
                      <p className="text-gray-600">{selectedDoc.pageCount ? `${selectedDoc.pageCount} páginas · ` : ''}Configura tu quiz</p>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={handleGenerateQuiz}
                      disabled={generating || selectedDoc.status !== 'indexed'}
                    >
                      <Sparkles className="w-5 h-5" />
                      {generating ? 'Generando...' : selectedDoc.status !== 'indexed' ? 'Esperando indexación' : 'Generar Quiz'}
                    </button>
                  </div>

                  {selectedDoc.status !== 'indexed' && (
                    <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                      El documento está en estado <strong>{selectedDoc.status}</strong>. Espera a que termine de indexarse para generar el examen.
                    </div>
                  )}

                  <div className="bg-purple-50 rounded-xl p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-gray-900">Configuración del Quiz</h3>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="font-medium text-gray-900">Número de Preguntas</label>
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
                          <span>5 (repaso rápido)</span>
                          <span>50 (examen completo)</span>
                        </div>
                      </div>

                      <div>
                        <label className="font-medium text-gray-900 mb-3 block">Nivel de Dificultad</label>
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
                        <label className="font-medium text-gray-900 mb-3 block">Tipos de Preguntas</label>
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
