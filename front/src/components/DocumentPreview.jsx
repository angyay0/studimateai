import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  X, FileText, CheckCircle, AlertCircle, Clock,
  Loader2, Trash2, Target, Calendar, HardDrive, Pencil, Check, Sparkles} from 'lucide-react'
import { documentsAPI } from '../services/api'
import SummaryModal from './SummaryModal'

/** Formatea bytes a una unidad legible (KB, MB) */
function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Badge de estado */
function StatusBadge({ status }) {
  const map = {
    indexed:    { label: 'Listo para quizzes', className: 'bg-green-100 text-green-700', Icon: CheckCircle },
    processing: { label: 'Procesando…',         className: 'bg-blue-100 text-blue-700',  Icon: Loader2 },
    indexing:   { label: 'Indexando…',          className: 'bg-blue-100 text-blue-700',  Icon: Loader2 },
    uploaded:   { label: 'Subido',              className: 'bg-gray-100 text-gray-600',  Icon: Clock },
    error:      { label: 'Error al procesar',   className: 'bg-red-100 text-red-700',    Icon: AlertCircle },
    failed:     { label: 'Error al procesar',   className: 'bg-red-100 text-red-700',    Icon: AlertCircle },
  }
  const { label, className, Icon } = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600', Icon: Clock }
  const spinning = status === 'processing' || status === 'indexing'

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${className}`}>
      <Icon className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
      {label}
    </span>
  )
}

export default function DocumentPreview({ doc, onClose, onDelete, onRename }) {
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(doc.originalFilename)
  const [renameError, setRenameError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  // Se puede resumir si el archivo ya está disponible en almacenamiento
  const canSummarize = doc.status === 'indexed' || doc.status === 'uploaded'

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (renaming) { setRenaming(false); setNewName(doc.originalFilename) }
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, renaming, doc.originalFilename])

  const handleRename = async () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === doc.originalFilename) { setRenaming(false); return }
    setSaving(true)
    setRenameError(null)
    try {
      const updated = await documentsAPI.rename(doc.id, trimmed)
      onRename?.(updated)
      setRenaming(false)
    } catch (err) {
      setRenameError(err.message || 'Error al renombrar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar "${doc.title}"?`)) {
      onDelete(doc.id)
      onClose()
    }
  }

  return (
    <>
    {/* Overlay */}
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel — detiene el click para que no cierre al hacer click adentro */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          {renaming ? (
            <div className="flex items-center gap-2 flex-1 pr-4">
              <input
                autoFocus
                className="input-field py-1 text-sm flex-1"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename() }}
                maxLength={255}
              />
              <button
                onClick={handleRename}
                disabled={saving}
                className="text-primary-600 hover:text-primary-800 transition-colors shrink-0"
                title="Guardar"
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 pr-4 min-w-0">
              <h2 className="font-bold text-gray-900 text-lg truncate">{doc.title}</h2>
              <button
                onClick={() => setRenaming(true)}
                className="text-gray-400 hover:text-primary-600 transition-colors shrink-0"
                title="Renombrar"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zona visual del PDF */}
        <div className="flex flex-col items-center justify-center bg-primary-50 py-10">
          <div className="w-20 h-20 bg-white rounded-2xl shadow flex items-center justify-center mb-3">
            <FileText className="w-10 h-10 text-primary-500" />
          </div>
          <p className="text-sm text-primary-600 font-medium">PDF</p>
        </div>

        {/* Metadata */}
        <div className="px-6 py-5 space-y-4">
          {renameError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600">{renameError}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Estado</span>
            <StatusBadge status={doc.status} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Subido
            </span>
            <span className="text-sm text-gray-700">{doc.uploadedAt}</span>
          </div>

          {doc.sizeBytes && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4" /> Tamaño
              </span>
              <span className="text-sm text-gray-700">{formatSize(doc.sizeBytes)}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Archivo original</span>
            <span className="text-sm text-gray-700 truncate max-w-[200px]">{doc.originalFilename}</span>
          </div>

          {doc.errorMessage && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{doc.errorMessage}</p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="px-6 pb-6 space-y-3">
          {canSummarize && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowSummary(true)}
                className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 font-medium transition-colors text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Resumir
              </button>
              {doc.status === 'indexed' && (
                <Link
                  to="/quiz-mode"
                  className="btn-primary flex-1 justify-center"
                  onClick={onClose}
                >
                  <Target className="w-4 h-4" />
                  Generar Quiz
                </Link>
              )}
            </div>
          )}
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </div>
    </div>

    {showSummary && (
      <SummaryModal doc={doc} onClose={() => setShowSummary(false)} />
    )}
    </>
  )
}
