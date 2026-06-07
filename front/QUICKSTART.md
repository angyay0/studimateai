# StudiMate AI - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### 1. Install Dependencies
```bash
cd front
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

### 3. Login
- Navigate to the login page
- Enter any email and password (mock authentication)
- Start exploring!

## 📱 Main Features to Test

### Landing Page (`/`)
- View the hero section and features
- Click "Get started" to go to login

### Login/Register (`/login`)
- Toggle between login and register
- Use any credentials (e.g., email: `test@example.com`, password: `test123`)

### Dashboard (`/dashboard`)
- View your study statistics
- See recent documents
- Check upcoming quizzes

### Upload & Generate (`/upload`)
- Upload PDF files (or use existing mock documents)
- Configure quiz settings:
  - Number of questions (5-50)
  - Difficulty level (Easy, Medium, Hard, Mixed)
  - Question types (Multiple Choice, True/False, etc.)
  - Optional focus topic
- Generate AI-powered quizzes

### Quiz Mode (`/quiz-mode`)
- View upcoming quizzes
- See quiz statistics
- Review recent results

### Progress (`/progress`)
- Track your study streak
- View weekly performance
- Monitor topic mastery
- See achievements

## 🎨 Design Highlights

- **Color Scheme**: Purple/Indigo primary colors
- **Icons**: Lucide React icons throughout
- **Responsive**: Works on desktop, tablet, and mobile
- **Animations**: Smooth transitions and hover effects

## 🔧 Development Tips

### Hot Reload
Vite provides instant hot module replacement. Changes appear immediately.

### Mock Data
All data is currently mocked in `src/services/api.js`. To connect to a real backend:
1. Update API endpoints
2. Replace mock functions with fetch/axios calls
3. Handle authentication tokens

### Adding New Pages
1. Create component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add navigation link in `src/components/Sidebar.jsx`

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Change port in vite.config.js or kill the process
lsof -ti:3000 | xargs kill
```

**Dependencies not installing?**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Build errors?**
```bash
# Clean build
rm -rf dist
npm run build
```

## 📦 Production Build

```bash
npm run build
npm run preview  # Preview production build locally
```

## 🐳 Docker Deployment

```bash
# Build image
docker build -t studimate-ai-frontend .

# Run container
docker run -p 80:80 studimate-ai-frontend
```

Access at: **http://localhost**

## 🎯 Next Steps

1. **Backend Integration**: Replace mock API with real endpoints
2. **PDF Processing**: Implement actual PDF text extraction
3. **AI Integration**: Connect to AI service for quiz generation
4. **Authentication**: Implement JWT or OAuth
5. **Database**: Store user data, documents, and quiz results
6. **Real-time Features**: Add WebSocket for live quizzes
7. **Mobile App**: Create React Native version

## 📞 Support

For issues or questions, refer to the main README.md or project documentation.

---

**Happy Coding! 🎓✨**
