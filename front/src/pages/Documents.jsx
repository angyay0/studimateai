import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Upload, Trash2, Eye, LayoutGrid, List,
  Search, AlertCircle, CheckCircle, Clock, Loader2
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import DocumentPreview from '../components/DocumentPreview'
import { documentsAPI } from '../services/api'

/** Badge de estado del documento */
function StatusBadge({ status }) {
  const map = {
    indexed:    { label: 'Listo',         className: 'bg-green-100 text-green-700' },
    processing: { label: 'Procesando…',   className: 'bg-blue-100 text-blue-700' },
    indexing:   { label: 'Indexando…',    className: 'bg-blue-100 text-blue-700' },
    uploaded:   { label: 'Subido',        className: 'bg-gray-100 text-gray-600' },
    error:      { label: 'Error',         className: 'bg-red-100 text-red-700' },
    failed:     { label: 'Error',         className: 'bg-red-100 text-red-700' },
  }
  const cfg = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }

  const Icon =
    status === 'indexed'                       ? CheckCircle :
    status === 'processing' || status === 'indexing' ? Loader2 :
    status === 'error' || status === 'failed'  ? AlertCircle :
    Clock

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      <Icon className={`w-3 h-3 ${status === 'processing' || status === 'indexing' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  )
}

/** Tarjeta en vista galería */
function GalleryCard({ doc, onPreview, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      {/* Área visual del PDF */}
      <div
        className="flex-1 flex flex-col items-center justify-center bg-primary-50 p-6 cursor-pointer min-h-[140px]"
        onClick={() => onPreview(doc)}
      >
        <FileText className="w-14 h-14 text-primary-400 mb-3" />
        <p className="text-xs text-primary-500 font-medium">PDF</p>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm truncate mb-1">{doc.title}</h3>
        <p className="text-xs text-gray-400 mb-3">{doc.uploadedAt}</p>
        <div className="flex items-center justify-between">
          <StatusBadge status={doc.status} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPreview(doc)}
              className="text-gray-400 hover:text-primary-600 transition-colors"
              title="Vista previa"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(doc.id)}
              className="text-gray-400 hover:text-red-600 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Fila en vista lista */
function ListRow({ doc, onPreview, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow px-4 py-3 flex items-center gap-4">
      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-primary-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{doc.title}</p>
        <p className="text-xs text-gray-400">{doc.originalFilename}</p>
      </div>

      <div className="hidden sm:block shrink-0">
        <StatusBadge status={doc.status} />
      </div>

      <p className="hidden md:block text-xs text-gray-400 shrink-0 w-36 text-right">
        {doc.uploadedAt}
      </p>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onPreview(doc)}
          className="text-gray-400 hover:text-primary-600 transition-colors"
          title="Vista previa"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(doc.id)}
          className="text-gray-400 hover:text-red-600 transition-colors"
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/** Estado vacío */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
        <FileText className="w-10 h-10 text-primary-300" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Aún no tienes documentos</h3>
      <p className="text-gray-500 mb-6 max-w-sm">
        Sube un PDF para empezar a generar quizzes y practicar con IA.
      </p>
      <Link to="/upload" className="btn-primary">
        <Upload className="w-4 h-4" />
        Subir primer documento
      </Link>
    </div>
  )
}

export default function Documents({ onLogout }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'gallery'
  const [previewDoc, setPreviewDoc] = useState(null)
  const [error, setError] = useState(null)

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await documentsAPI.getAll()
      setDocuments(docs)
    } catch (err) {
      setError('No se pudieron cargar los documentos.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleDelete = async (docId) => {
    if (!window.confirm('¿Eliminar este documento?')) return
    try {
      await documentsAPI.delete(docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
      if (previewDoc?.id === docId) setPreviewDoc(null)
    } catch (err) {
      setError(err.message || 'Error al eliminar el documento.')
    }
  }

  const filtered = documents.filter(doc =>
    doc.title.toLowerCase().includes(search.toLowerCase()) ||
    doc.originalFilename?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando documentos…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={onLogout} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">

          {/* Encabezado */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Documentos</h1>
              <p className="text-gray-500 mt-1">
                {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
              </p>
            </div>
            <Link to="/upload" className="btn-primary">
              <Upload className="w-4 h-4" />
              Subir documento
            </Link>
          </div>

          {/* Error global */}
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
              <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {documents.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Barra de búsqueda + toggle de vista */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="input-field pl-9"
                  />
                </div>
                <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Vista lista"
                  >
                    <List className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('gallery')}
                    className={`p-2 transition-colors ${viewMode === 'gallery' ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Vista galería"
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sin resultados de búsqueda */}
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No se encontraron documentos con "{search}"</p>
                </div>
              ) : viewMode === 'gallery' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map(doc => (
                    <GalleryCard key={doc.id} doc={doc} onPreview={setPreviewDoc} onDelete={handleDelete} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(doc => (
                    <ListRow key={doc.id} doc={doc} onPreview={setPreviewDoc} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de vista previa */}
      {previewDoc && (
        <DocumentPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} onDelete={handleDelete} />
      )}
    </div>
  )
}
