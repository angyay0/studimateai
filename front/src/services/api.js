const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

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
  login: async (email, password) => {
    await delay(800)
    
    if (email && password) {
      const token = 'mock-jwt-token-' + Date.now()
      const user = {
        id: 1,
        name: 'Maria',
        email: email,
        plan: 'Free plan',
        documentsCount: 3
      }
      
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      return { success: true, token, user }
    }
    
    throw new Error('Invalid credentials')
  },
  
  register: async (name, email, password) => {
    await delay(800)
    
    if (name && email && password) {
      const token = 'mock-jwt-token-' + Date.now()
      const user = {
        id: Date.now(),
        name: name,
        email: email,
        plan: 'Free plan',
        documentsCount: 0
      }
      
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      return { success: true, token, user }
    }
    
    throw new Error('Registration failed')
  },
  
  logout: async () => {
    await delay(300)
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    return { success: true }
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }
}

export const documentsAPI = {
  getAll: async () => {
    await delay(500)
    return mockDocuments
  },
  
  upload: async (file, config) => {
    await delay(2000)
    
    const newDoc = {
      id: Date.now(),
      title: file.name.replace('.pdf', ''),
      pages: Math.floor(Math.random() * 100) + 20,
      quizzes: 0,
      uploadedAt: 'Just now',
      icon: '📄'
    }
    
    return newDoc
  },
  
  delete: async (id) => {
    await delay(500)
    return { success: true }
  }
}

export const quizzesAPI = {
  getUpcoming: async () => {
    await delay(500)
    return mockQuizzes
  },
  
  generate: async (documentId, config) => {
    await delay(3000)
    
    const questions = []
    const questionCount = config.questionCount || 20
    
    for (let i = 0; i < questionCount; i++) {
      questions.push({
        id: i + 1,
        type: config.questionTypes[Math.floor(Math.random() * config.questionTypes.length)],
        question: `Sample question ${i + 1} about the topic`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 0,
        difficulty: config.difficulty
      })
    }
    
    return {
      id: Date.now(),
      documentId,
      questions,
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
