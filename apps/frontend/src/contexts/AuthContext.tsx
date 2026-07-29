import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3334`

interface User {
  id: number
  email: string
  fullName: string | null
  role: 'user' | 'admin'
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (fullName: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'produtos-app:auth-token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [isLoading, setIsLoading] = useState(true)

  const clearAuth = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(TOKEN_KEY)
  }, [])

  // Listen for 401 events dispatched from apiFetch
  useEffect(() => {
    const handler = () => clearAuth()
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [clearAuth])

  // On mount, try to load user profile if token exists
  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    fetch(`${API_URL}/api/v1/account/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        } else {
          clearAuth()
        }
      })
      .catch(() => {
        clearAuth()
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token, clearAuth])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.errors?.[0]?.message || data.error || 'Falha ao fazer login')
    }

    const data = await res.json()
    const newToken = data.token?.token || data.token
    if (!newToken) throw new Error('Token não recebido do servidor')

    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    setUser(data.user || null)

    // If user wasn't in the response, fetch profile
    if (!data.user) {
      const profileRes = await fetch(`${API_URL}/api/v1/account/profile`, {
        headers: { Authorization: `Bearer ${newToken}` },
      })
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setUser(profileData)
      }
    }
  }, [])

  const signup = useCallback(async (fullName: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.errors?.[0]?.message || data.error || 'Falha ao criar conta')
    }

    const data = await res.json()
    const newToken = data.token?.token || data.token
    if (!newToken) throw new Error('Token não recebido do servidor')

    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    setUser(data.user || null)

    if (!data.user) {
      const profileRes = await fetch(`${API_URL}/api/v1/account/profile`, {
        headers: { Authorization: `Bearer ${newToken}` },
      })
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setUser(profileData)
      }
    }
  }, [])

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${API_URL}/api/v1/account/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // Ignore logout errors
      }
    }
    clearAuth()
  }, [token, clearAuth])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
