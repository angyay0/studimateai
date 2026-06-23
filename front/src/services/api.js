const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005'

const getStorage = () => (
  localStorage.getItem('rememberMe') === 'true' ? localStorage : sessionStorage
)

const getAuthToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken')

const saveAuthSession = (data, rememberMe) => {
  const storage = rememberMe ? localStorage : sessionStorage
  const otherStorage = rememberMe ? sessionStorage : localStorage

  otherStorage.removeItem('authToken')
  otherStorage.removeItem('user')
  storage.setItem('authToken', data.token)
  storage.setItem('user', JSON.stringify(data.user))
  localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false')

  if (rememberMe) {
    localStorage.setItem('rememberedEmail', data.user.email)
  } else {
    localStorage.removeItem('rememberedEmail')
  }
}

const clearAuthSession = () => {
  localStorage.removeItem('authToken')
  localStorage.removeItem('user')
  sessionStorage.removeItem('authToken')
  sessionStorage.removeItem('user')
}

// Helper for making authenticated API calls
const api = {
  get: async (endpoint, options = {}) => {
    const url = endpoint.startsWith('/api') ? `${API_URL}${endpoint}` : `${API_URL}/api${endpoint}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {}),
        ...options.headers
      },
      ...options
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed')
    }
    
    return { data, status: response.status }
  },
  
  post: async (endpoint, body, options = {}) => {
    const url = endpoint.startsWith('/api') ? `${API_URL}${endpoint}` : `${API_URL}/api${endpoint}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {}),
        ...options.headers
      },
      body: JSON.stringify(body),
      ...options
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed')
    }
    
    return { data, status: response.status }
  },
  
  delete: async (endpoint, options = {}) => {
    const url = endpoint.startsWith('/api') ? `${API_URL}${endpoint}` : `${API_URL}/api${endpoint}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {}),
        ...options.headers
      },
      ...options
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed')
    }
    
    return { data, status: response.status }
  }
}

const mockDocuments = [
  {
    id: 1,
    title: 'Cell Biology Chapter 4-6',
    pages: 48,
    quizzes: 3,
    uploadedAt: '2h ago',
    icon: '🧬'
  },
  {
    id: 2,
    title: 'Organic Chemistry Textbook',
    pages: 92,
    quizzes: 5,
    uploadedAt: 'Yesterday',
    icon: '🧪'
  },
  {
    id: 3,
    title: 'World History: WWI',
    pages: 34,
    quizzes: 2,
    uploadedAt: '3 days ago',
    icon: '📖'
  }];

const buildProgressData = (attempts) => {
  const sortedAttempts = [...attempts]
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))

  const weekBuckets = Array.from({ length: 7 }, () => [])
  const today = startOfDay(new Date())

  for (let offset = 6; offset >= 0; offset -= 1) {
    const target = new Date(today)
    target.setDate(target.getDate() - offset)
    weekBuckets[6 - offset] = sortedAttempts.filter((attempt) => {
      const submitted = parseDate(attempt.submittedAt)
      return submitted && submitted.toDateString() === target.toDateString()
    })
  }

  const weeklyScores = weekBuckets.map((bucket) => (
    bucket.length > 0 ? Math.round(average(bucket.map((attempt) => Number(attempt.score) || 0))) : 0
  ))

  const masteryMap = new Map()
  sortedAttempts.forEach((attempt) => {
    const label = getDocumentLabel(attempt)
    const current = masteryMap.get(label) || { scores: [], label }
    current.scores.push(Number(attempt.score) || 0)
    masteryMap.set(label, current)
  })

  const topicMastery = [...masteryMap.values()]
    .map((entry) => ({
      topic: entry.label,
      mastery: Math.round(average(entry.scores))
    }))
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 4)

  const activeDays = new Set(
    sortedAttempts.map((attempt) => {
      const submitted = parseDate(attempt.submittedAt)
      return submitted ? submitted.toDateString() : null
    }).filter(Boolean)
  )

  let studyStreak = 0
  for (let offset = 0; offset < 365; offset += 1) {
    const day = new Date(today)
    day.setDate(day.getDate() - offset)
    if (activeDays.has(day.toDateString())) {
      studyStreak += 1
    } else if (offset > 0) {
      break
    }
  }

  return {
    weeklyScores,
    topicMastery,
    studyStreak,
    overallScore: Math.round(average(sortedAttempts.map((attempt) => Number(attempt.score) || 0))),
    attemptCount: sortedAttempts.length,
    documentsPracticed: masteryMap.size
  }
}

export const authAPI = {
  login: async (email, password, rememberMe = false) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, rememberMe })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Invalid credentials')
    }

    saveAuthSession(data, rememberMe)

    return data
  },
  
  register: async (name, email, password) => {
    const [firstName, ...lastNameParts] = name.trim().split(' ')
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName: lastNameParts.join(' ')
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed')
    }

    saveAuthSession({
      ...data,
      user: {
      ...data.user,
      plan: 'Free plan',
      documentsCount: 0
      }
    }, true)

    return data
  },

  getAuthHeader: () => {
    const token = getAuthToken()

    return token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {}
  },

  validateSession: async () => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        ...authAPI.getAuthHeader()
      }
    })

    if (!response.ok) {
      clearAuthSession()
      throw new Error('Session expired')
    }

    return response.json()
  },

  forgotPassword: async (email) => {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Could not request password reset')
    }

    return data
  },

  resetPassword: async (email, token, password) => {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, token, password })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Could not reset password')
    }

    return data
  },
  
  logout: async () => {
    const token = getAuthToken()

    if (token) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          ...authAPI.getAuthHeader()
        }
      }).catch(() => null)
    }

    clearAuthSession()
    return { success: true }
  },
  
  getCurrentUser: () => {
    const userStr = getStorage().getItem('user') || localStorage.getItem('user') || sessionStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  hasSession: () => Boolean(getAuthToken()),

  isRemembered: () => localStorage.getItem('rememberMe') === 'true',

  getRememberedEmail: () => localStorage.getItem('rememberedEmail') || ''
}

export const documentsAPI = {
  getAll: async (courseId = null) => {
    const url = courseId 
      ? `${API_URL}/api/documents?courseId=${courseId}`
      : `${API_URL}/api/documents`
    
    const response = await fetch(url, {
      headers: {
        ...authAPI.getAuthHeader()
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch documents')
    }

    return data.documents.map(doc => ({
      ...doc, // Preserve all original fields
      title: doc.originalFilename.replace(/\.(pdf|txt|md|docx)$/i, ''),
      uploadedAt: new Date(doc.createdAt).toLocaleString(),
      icon: doc.mimeType === 'application/pdf' ? '📄' : '📝',
      pages: null
    }))
  },
  
  upload: (file, onProgress = () => {}, config = {}) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      if (config.courseId) {
        formData.append('courseId', config.courseId)
      }

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          onProgress(percent)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            const doc = data.document
            resolve({
              id: doc.id,
              title: doc.originalFilename.replace(/\.(pdf|txt|md|docx)$/i, ''),
              originalFilename: doc.originalFilename,
              mimeType: doc.mimeType,
              sizeBytes: doc.sizeBytes,
              status: doc.status,
              errorMessage: doc.errorMessage,
              uploadedAt: 'Just now',
              icon: doc.mimeType === 'application/pdf' ? '📄' : '📝',
              pages: null
            })
          } catch {
            reject(new Error('Respuesta inválida del servidor'))
          }
        } else {
          let message = 'Failed to upload document'
          try {
            const body = JSON.parse(xhr.responseText)
            message = body.error || body.message || message
          } catch { /* ignore */ }
          reject(new Error(message))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('Error de red al subir el archivo')))
      xhr.addEventListener('abort', () => reject(new Error('Subida cancelada')))

      const token = getAuthToken()
      xhr.open('POST', `${API_URL}/api/documents/upload`)
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })
  },
  
  rename: async (documentId, newName) => {
    const response = await fetch(`${API_URL}/api/documents/${documentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authAPI.getAuthHeader()
      },
      body: JSON.stringify({ name: newName })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to rename document')
    }

    const doc = data.document
    return {
      id: doc.id,
      title: doc.originalFilename.replace(/\.(pdf|txt|md|docx)$/i, ''),
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      status: doc.status,
      errorMessage: doc.errorMessage,
      uploadedAt: new Date(doc.createdAt).toLocaleString(),
      icon: doc.mimeType === 'application/pdf' ? '📄' : '📝',
      pages: null
    }
  },

  delete: async (documentId) => {
    const response = await fetch(`${API_URL}/api/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        ...authAPI.getAuthHeader()
      }
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete document')
    }

    return { success: true }
  },

  summarize: async (documentId) => {
    const response = await fetch(`${API_URL}/api/documents/${documentId}/summarize`, {
      method: 'POST',
      headers: {
        ...authAPI.getAuthHeader()
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'No se pudo generar el resumen')
    }

    return {
      documentId: data.documentId,
      title: data.title,
      summary: data.summary
    }
  }
}

export const quizzesAPI = {
  getUpcoming: async (documentId = null) => {
    const params = documentId ? `?documentId=${documentId}` : ''
    const response = await api.get(`/exams${params}`)
    
    // Transform backend questions to quiz format
    const questions = response.data.questions || []
    
    if (questions.length === 0) {
      return []
    }
    
    // Group questions by document (if available) or create a single quiz
    const quizzes = [{
      id: Date.now().toString(),
      title: documentId ? 'Generated Quiz' : 'All Questions',
      questionCount: questions.length,
      duration: questions.length * 2, // 2 minutes per question
      difficulty: questions[0]?.difficulty || 'medium',
      topic: 'Study Material',
      questions: questions.map((q, index) => ({
        id: index + 1,
        question: q.questionText,
        type: q.questionType,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }))
    }]
    
    return quizzes
  },

  deleteAll: async (documentId = null) => {
    const params = documentId ? `?documentId=${documentId}` : ''
    const response = await api.delete(`/exams${params}`)
    return response.data
  },
  
  generate: async (documentId, config) => {
    const difficultyMap = {
      'Easy': 'easy',
      'Medium': 'medium',
      'Hard': 'hard',
      'Mixed': 'medium'
    }

    const typeMap = {
      'Multiple Choice': 'multiple_choice',
      'True / False': 'true_false',
      'Fill in the blank': 'fill_blank',
      'Open-ended': 'open_ended'
    }

    const response = await fetch(`${API_URL}/api/exams/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authAPI.getAuthHeader()
      },
      body: JSON.stringify({
        documentIds: config.documentIds || (documentId ? [documentId] : undefined),
        questionCount: config.questionCount || 20,
        difficulty: difficultyMap[config.difficulty] || 'medium',
        questionTypes: config.questionTypes?.map(t => typeMap[t] || 'multiple_choice'),
        topic: config.focusTopic || undefined,
        courseId: config.courseId || undefined
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate quiz')
    }

    return {
      id: Date.now(),
      documentId,
      questions: data.questions.map((q, i) => ({
        id: i + 1,
        type: q.questionType,
        question: q.questionText,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty
      })),
      config
    }
  },
  
  submit: async (quizId, answers) => {
    await delay(1000)
    
    const score = Math.floor(Math.random() * 30) + 70
    
    return {
      score,
      totalQuestions: answers.length,
      correctAnswers: Math.floor(answers.length * (score / 100)),
      timeTaken: '15:30'
    }
  },

  saveAttempt: async (attempt) => {
    const response = await fetch(`${API_URL}/api/exams/attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authAPI.getAuthHeader()
      },
      body: JSON.stringify(attempt)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save exam attempt')
    }

    return data.attempt
  },

  getAttempts: async () => {
    const response = await fetch(`${API_URL}/api/exams/attempts`, {
      headers: {
        ...authAPI.getAuthHeader()
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch exam attempts')
    }

    return data.attempts
  }
}

export const statsAPI = {
  getDashboard: async () => {
    const [documents, attempts] = await Promise.all([
      documentsAPI.getAll(),
      quizzesAPI.getAttempts()
    ])

    return buildDashboardStats(documents, attempts)
  },
  
  getProgress: async () => {
    const attempts = await quizzesAPI.getAttempts()
    return buildProgressData(attempts)
  }
}

// Flashcards API
export const flashcardsAPI = {
  generate: async (documentId, config = {}) => {
    const response = await api.post('/flashcards/generate', { 
      documentId,
      count: config.count || 10,
      type: config.type || 'concept'
    })
    return response.data
  },

  getAll: async (documentId = null) => {
    const params = documentId ? { documentId } : {}
    const response = await api.get('/flashcards', { params })
    return response.data.flashcards
  },

  getDue: async () => {
    const response = await api.get('/flashcards/due')
    return response.data.flashcards
  },

  getDueCount: async () => {
    const response = await api.get('/flashcards/due/count')
    return response.data.count
  },

  review: async (flashcardId, rating) => {
    const response = await api.post(`/flashcards/${flashcardId}/review`, { rating })
    return response.data.flashcard
  },

  deleteForDocument: async (documentId) => {
    const response = await api.delete(`/flashcards/document/${documentId}`)
    return response.data.deletedCount
  }
}
