import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, Eye, EyeOff, Sparkles, Mail, Lock, User } from 'lucide-react'
import { authAPI } from '../services/api'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const minPasswordLength = 8
const passwordPolicyPattern = /^(?=.*[A-Za-z])(?=.*[^A-Za-z0-9]).{8,}$/
const passwordPolicyMessage = 'Password must be at least 8 characters and include one letter and one symbol.'

function validateAuthForm(formData, isLogin) {
  const errors = {}

  if (!isLogin && !formData.name.trim()) {
    errors.name = 'Full name is required.'
  }

  if (!formData.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!emailPattern.test(formData.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!formData.password) {
    errors.password = 'Password is required.'
  } else if (!isLogin && !passwordPolicyPattern.test(formData.password)) {
    errors.password = passwordPolicyMessage
  }

  if (!isLogin && !formData.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (!isLogin && formData.confirmPassword !== formData.password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

function LoginPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [authView, setAuthView] = useState('auth')
  const [formData, setFormData] = useState({
    name: '',
    email: authAPI.getRememberedEmail(),
    password: '',
    confirmPassword: '',
    resetToken: '',
    resetPassword: '',
    resetConfirmPassword: '',
    rememberMe: authAPI.isRemembered()
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  const resetForm = () => {
    setFormData({
      name: '',
      email: authAPI.getRememberedEmail(),
      password: '',
      confirmPassword: '',
      resetToken: '',
      resetPassword: '',
      resetConfirmPassword: '',
      rememberMe: authAPI.isRemembered()
    })
    setFieldErrors({})
    setError('')
    setSuccessMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    const validationErrors = validateAuthForm(formData, isLogin)
    setFieldErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        await authAPI.login(formData.email, formData.password, formData.rememberMe)
        onLogin()
        navigate('/dashboard')
      } else {
        await authAPI.register(formData.name, formData.email, formData.password)
        setSuccessMessage('Account created successfully. Redirecting to your dashboard...')
        onLogin()
        setTimeout(() => {
          navigate('/dashboard')
        }, 700)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: e.target.type === 'checkbox' ? e.target.checked : value
    })

    setFieldErrors({
      ...fieldErrors,
      [name]: ''
    })
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    const validationErrors = {}

    if (!formData.email.trim()) {
      validationErrors.email = 'Email is required.'
    } else if (!emailPattern.test(formData.email.trim())) {
      validationErrors.email = 'Enter a valid email address.'
    }

    setFieldErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setLoading(true)

    try {
      const result = await authAPI.forgotPassword(formData.email)
      setFormData({
        ...formData,
        resetToken: result.resetToken || ''
      })
      setAuthView('reset')
      setSuccessMessage(
        result.resetToken
          ? 'Development reset token generated. Paste it below to create a new password.'
          : 'If the email exists, password reset instructions will be sent.'
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    const validationErrors = {}

    if (!formData.email.trim()) {
      validationErrors.email = 'Email is required.'
    }

    if (!formData.resetToken.trim()) {
      validationErrors.resetToken = 'Reset token is required.'
    }

    if (!formData.resetPassword) {
      validationErrors.resetPassword = 'New password is required.'
    } else if (!passwordPolicyPattern.test(formData.resetPassword)) {
      validationErrors.resetPassword = passwordPolicyMessage
    }

    if (formData.resetPassword !== formData.resetConfirmPassword) {
      validationErrors.resetConfirmPassword = 'Passwords do not match.'
    }

    setFieldErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setLoading(true)

    try {
      await authAPI.resetPassword(formData.email, formData.resetToken, formData.resetPassword)
      setSuccessMessage('Password updated successfully. You can now log in.')
      setAuthView('auth')
      setIsLogin(true)
      setFormData({
        name: '',
        email: formData.email,
        password: '',
        confirmPassword: '',
        resetToken: '',
        resetPassword: '',
        resetConfirmPassword: '',
        rememberMe: authAPI.isRemembered()
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setAuthView('auth')
    resetForm()
  }

  const renderPasswordToggle = (isVisible, onClick, label) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
      aria-label={label}
    >
      {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  )

  const title = authView === 'forgot'
    ? 'Reset your password'
    : authView === 'reset'
      ? 'Create a new password'
      : isLogin ? 'Welcome back!' : 'Create your account'

  const subtitle = authView === 'forgot'
    ? 'Enter your email to get a reset token'
    : authView === 'reset'
      ? 'Use your reset token to update your password'
      : isLogin
        ? 'Log in to continue your learning journey'
        : 'Start studying smarter with your own account'

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold">
              StudiMate <span className="text-primary-600">AI</span>
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {title}
          </h1>
          <p className="text-gray-600">{subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start gap-2">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {authView === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`input-field pl-10 ${fieldErrors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                    placeholder="you@example.com"
                  />
                </div>
                {fieldErrors.email && (
                  <p id="email-error" className="mt-2 text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : 'Send reset instructions'}
              </button>
            </form>
          )}

          {authView === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reset Token
                </label>
                <input
                  type="text"
                  name="resetToken"
                  value={formData.resetToken}
                  onChange={handleChange}
                  className={`input-field ${fieldErrors.resetToken ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                  placeholder="Paste your reset token"
                />
                {fieldErrors.resetToken && (
                  <p className="mt-2 text-sm text-red-600">{fieldErrors.resetToken}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    name="resetPassword"
                    value={formData.resetPassword}
                    onChange={handleChange}
                    className={`input-field pl-10 pr-10 ${fieldErrors.resetPassword ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                    placeholder="********"
                  />
                  {renderPasswordToggle(showResetPassword, () => setShowResetPassword(!showResetPassword), 'Toggle new password visibility')}
                </div>
                {fieldErrors.resetPassword && (
                  <p className="mt-2 text-sm text-red-600">{fieldErrors.resetPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showResetConfirmPassword ? 'text' : 'password'}
                    name="resetConfirmPassword"
                    value={formData.resetConfirmPassword}
                    onChange={handleChange}
                    className={`input-field pl-10 pr-10 ${fieldErrors.resetConfirmPassword ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                    placeholder="********"
                  />
                  {renderPasswordToggle(showResetConfirmPassword, () => setShowResetConfirmPassword(!showResetConfirmPassword), 'Toggle confirm new password visibility')}
                </div>
                {fieldErrors.resetConfirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{fieldErrors.resetConfirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : 'Update password'}
              </button>
            </form>
          )}

          {authView === 'auth' && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`input-field pl-10 ${fieldErrors.name ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                    placeholder="Maria Garcia"
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  />
                </div>
                {fieldErrors.name && (
                  <p id="name-error" className="mt-2 text-sm text-red-600">{fieldErrors.name}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field pl-10 ${fieldErrors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="mt-2 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field pl-10 pr-10 ${fieldErrors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                  placeholder="********"
                  minLength={isLogin ? undefined : minPasswordLength}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={
                    !isLogin
                      ? 'password-help password-error'
                      : fieldErrors.password ? 'password-error' : undefined
                  }
                />
                {renderPasswordToggle(showPassword, () => setShowPassword(!showPassword), 'Toggle password visibility')}
              </div>
              {!isLogin && (
                <p id="password-help" className="mt-2 text-xs text-gray-500">
                  Use at least 8 characters, one letter, and one symbol.
                </p>
              )}
              {fieldErrors.password && (
                <p id="password-error" className="mt-2 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`input-field pl-10 pr-10 ${fieldErrors.confirmPassword ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                    placeholder="********"
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
                  />
                  {renderPasswordToggle(showConfirmPassword, () => setShowConfirmPassword(!showConfirmPassword), 'Toggle confirm password visibility')}
                </div>
                {fieldErrors.confirmPassword && (
                  <p id="confirm-password-error" className="mt-2 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('forgot')
                    setError('')
                    setFieldErrors({})
                    setSuccessMessage('')
                  }}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Log in' : 'Create account')}
            </button>
          </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {authView === 'auth' ? (
                <>
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={toggleMode}
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setAuthView('auth')
                    setIsLogin(true)
                    setError('')
                    setFieldErrors({})
                    setSuccessMessage('')
                  }}
                  className="text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Back to login
                </button>
              )}
            </p>
          </div>

          {authView === 'auth' && !isLogin && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Free 14-day trial</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

export default LoginPage
