# StudiMate AI - Frontend

An intelligent, AI-based exam simulator that allows students to upload academic materials, generate personalized questions, practice in exam mode, and track their progress.

## 🚀 Features

- **Landing Page**: Beautiful hero section with feature highlights
- **Authentication**: Login and registration with mock API
- **Dashboard**: Overview of stats, recent documents, and upcoming quizzes
- **Upload & Generate**: Upload PDFs and configure AI-generated quizzes
- **Quiz Mode**: Take quizzes and view results
- **Progress Tracking**: Visual analytics of performance and topic mastery

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library

## 📦 Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🏗️ Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

## 🐳 Docker Support

This project is designed to be deployed with Docker. A Dockerfile will be added in the future.

## 📁 Project Structure

```
front/
├── src/
│   ├── components/       # Reusable components (Navbar, Sidebar)
│   ├── pages/           # Page components
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── UploadGenerate.jsx
│   │   ├── QuizMode.jsx
│   │   └── Progress.jsx
│   ├── services/        # API service layer (mock data)
│   │   └── api.js
│   ├── App.jsx          # Main app with routing
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
└── tailwind.config.js   # TailwindCSS configuration
```

## 🔐 Authentication

The app uses a mock authentication system. You can log in with any email and password. The auth token is stored in localStorage.

**Test credentials:**
- Email: any valid email
- Password: any password

## 🎨 Design

The design is based on modern UI/UX principles with:
- Purple/indigo primary color scheme
- Clean, minimal interface
- Responsive design
- Smooth transitions and animations

## 🔄 Mock API

All API calls use mock data defined in `src/services/api.js`. The mock API simulates:
- User authentication
- Document upload and management
- Quiz generation and submission
- Statistics and progress tracking

**To replace with real API:**
1. Update the base URL in `api.js`
2. Replace mock functions with actual HTTP requests
3. Handle authentication tokens properly

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎯 Future Enhancements

- Real backend API integration
- PDF processing and text extraction
- AI-powered quiz generation
- Real-time quiz taking with timer
- Advanced analytics and insights
- Social features (study groups, leaderboards)
- Mobile app version

## 📄 License

This project is part of StudiMate AI platform.
