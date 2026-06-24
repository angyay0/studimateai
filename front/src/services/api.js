const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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

const parseDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const startOfDay = (date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

const sum = (values) => values.reduce((total, value) => total + value, 0)

const average = (values) => values.length ? sum(values) / values.length : 0

const getDocumentLabel = (attempt) => {
  const sourceTitle = attempt?.config?.sourceDocumentTitle
  const sourceId = attempt?.config?.sourceDocumentId
  return sourceTitle || sourceId || 'Documento'
}

const buildDashboardStats = (documents, attempts) => {
  const attemptScores = attempts.map((attempt) => Number(attempt.score) || 0)
  const currentWeekStart = startOfDay(new Date())
  currentWeekStart.setDate(currentWeekStart.getDate() - 6)
  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const currentWeekEnd = new Date(currentWeekStart)
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 7)

  const currentWeekAttempts = attempts.filter((attempt) => {
    const submitted = parseDate(attempt.submittedAt)
    return submitted && submitted >= currentWeekStart && submitted < currentWeekEnd
  })

  const previousWeekAttempts = attempts.filter((attempt) => {
    const submitted = parseDate(attempt.submittedAt)
    return submitted && submitted >= previousWeekStart && submitted < currentWeekStart
  })

  const currentWeekScores = currentWeekAttempts.map((attempt) => Number(attempt.score) || 0)
  const previousWeekScores = previousWeekAttempts.map((attempt) => Number(attempt.score) || 0)

  const currentWeekHours = sum(currentWeekAttempts.map((attempt) => Number(attempt.timeTakenSeconds) || 0)) / 3600
  const totalHours = sum(attempts.map((attempt) => Number(attempt.timeTakenSeconds) || 0)) / 3600
  const totalQuizzes = attempts.length
  const topicsMastered = new Set(attempts.map((attempt) => getDocumentLabel(attempt))).size

  const weeklyDelta = currentWeekAttempts.length - previousWeekAttempts.length
  const scoreDelta = average(currentWeekScores) - average(previousWeekScores)

  return {
    quizzesTaken: totalQuizzes,
    quizzesChange: weeklyDelta >= 0 ? `+${weeklyDelta} this week` : `${weeklyDelta} this week`,
    avgScore: Math.round(average(attemptScores)),
    scoreChange: `${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(0)}% from last week`,
    hoursStudied: Number(totalHours.toFixed(1)),
    hoursChange: currentWeekHours > 0 ? `${currentWeekHours.toFixed(1)}h this week` : 'No recent activity',
    topicsMastered,
    topicsChange: topicsMastered > 0 ? `${topicsMastered} documents practiced` : 'No documents yet'
  }
}

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
  }
}

export const quizzesAPI = {
  getUpcoming: async () => {
    return []
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
