import { useEffect, useState } from 'react';
import { X, Copy, Download, Loader2, AlertCircle, Sparkles, Check } from 'lucide-react';
import { documentsAPI } from '../services/api';

/**
 * Renderiza el resumen (texto estructurado con "## títulos" y "- viñetas")
 * como elementos con estilo, sin depender de un renderizador de markdown.
 */
function renderSummary(summary) {
  const lines = summary.split('\n');
  const blocks = [];
  let bullets = [];

  const flushBullets = (key) => {
    if (bullets.length > 0) {
      blocks.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 space-y-1.5 my-2">
          {bullets.map((b, i) => (
            <li key={i} className="text-sm text-gray-700 leading-relaxed">
              {b}
            </li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();

    if (line === '') {
      flushBullets(idx);
      return;
    }

    // Títulos de sección: "## ..." o "# ..."
    if (line.startsWith('## ')) {
      flushBullets(idx);
      blocks.push(
        <h3 key={idx} className="text-base font-bold text-gray-900 mt-4 first:mt-0">
          {line.replace(/^##\s+/, '')}
        </h3>
      );
      return;
    }
    if (line.startsWith('# ')) {
      flushBullets(idx);
      blocks.push(
        <h2 key={idx} className="text-lg font-bold text-gray-900 mt-4 first:mt-0">
          {line.replace(/^#\s+/, '')}
        </h2>
      );
      return;
    }

    // Viñetas: "- ", "* " o "• "
    if (/^[-*•]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*•]\s+/, ''));
      return;
    }

    // Párrafo normal (quita negritas de markdown si las hubiera)
    flushBullets(idx);
    blocks.push(
      <p key={idx} className="text-sm text-gray-700 leading-relaxed">
        {line.replace(/\*\*/g, '')}
      </p>
    );
  });

  flushBullets('end');
  return blocks;
}

export default function SummaryModal({ doc, onClose }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // Pide el resumen al abrir el modal
  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await documentsAPI.summarize(doc.id);
        if (!cancelled) setSummary(result.summary);
      } catch (err) {
        if (!cancelled) setError(err.message || 'No se pudo generar el resumen');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [doc.id]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Copia texto al portapapeles con fallback para contextos no seguros (HTTP)
  // o navegadores que no exponen navigator.clipboard (común en Codespaces con
  // puertos reenviados). Si el método moderno no está disponible, usa un
  // <textarea> temporal con document.execCommand('copy').
  const copyToClipboard = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const ok = document.execCommand('copy');
      if (!ok) throw new Error("execCommand('copy') devolvió false");
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard(summary);
      setCopyError(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No tocamos el estado `error` para no ocultar el resumen ya generado.
      setCopied(false);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  const handleDownload = () => {
    const baseName = (doc.title || 'resumen').replace(/\.(pdf|txt|md|docx)$/i, '');
    const content = `# Resumen: ${doc.title}\n\n${summary}\n`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}-resumen.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-primary-500 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 text-lg leading-tight">Resumen con IA</h2>
              <p className="text-xs text-gray-500 truncate">{doc.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-700">Generando resumen…</p>
              <p className="text-xs text-gray-500 mt-1">
                Esto puede tardar unos segundos en documentos largos.
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-4">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">No se pudo generar el resumen</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && <div className="space-y-1">{renderSummary(summary)}</div>}
        </div>

        {/* Acciones */}
        {!loading && !error && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : copyError ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copiado' : copyError ? 'No se pudo copiar' : 'Copiar'}
            </button>
            <button onClick={handleDownload} className="btn-primary flex-1 justify-center">
              <Download className="w-4 h-4" />
              Descargar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
