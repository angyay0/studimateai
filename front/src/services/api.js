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
  }
]

const mockQuizzes = [
  {
    id: 1,
    title: 'Cell Biology — Mitosis',
    time: 'Today, 4:00 PM',
    difficulty: 'Medium',
    subject: 'Cell Biology'
  },
  {
    id: 2,
    title: 'Organic Chemistry — Bonds',
    time: 'Tomorrow, 10:00 AM',
    difficulty: 'Hard',
    subject: 'Organic Chemistry'
  }
]

const mockStats = {
  quizzesTaken: 47,
  quizzesChange: '+3 this week',
  avgScore: 83,
  scoreChange: '+5% from last week',
  hoursStudied: 38,
  hoursChange: 'This month',
  topicsMastered: 12,
  topicsChange: '4 in progress'
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
  
  upload: async (file, config = {}) => {
    const formData = new FormData()
    formData.append('file', file)
    if (config.courseId) {
      formData.append('courseId', config.courseId)
    }

    const response = await fetch(`${API_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        ...authAPI.getAuthHeader()
      },
      body: formData
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload document')
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
      uploadedAt: 'Just now',
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
    await delay(500)
    return mockQuizzes
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
        documentIds: documentId ? [documentId] : undefined,
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
  }
}

export const statsAPI = {
  getDashboard: async () => {
    await delay(500)
    return mockStats
  },
  
  getProgress: async () => {
    await delay(500)
    
    return {
      weeklyScores: [75, 78, 82, 85, 83, 88, 90],
      topicMastery: [
        { topic: 'Cell Biology', mastery: 85 },
        { topic: 'Organic Chemistry', mastery: 72 },
        { topic: 'World History', mastery: 68 },
        { topic: 'Physics', mastery: 55 }
      ],
      studyStreak: 14
    }
  }
}
