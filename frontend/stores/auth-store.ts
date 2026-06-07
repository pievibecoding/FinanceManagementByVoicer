import { create } from 'zustand'

const TOKEN_KEY = 'finance_auth_token'
const USER_ID_KEY = 'finance_auth_user_id'
const EMAIL_KEY = 'finance_auth_email'
const NAME_KEY = 'finance_auth_name'

interface AuthUser {
  id: number
  email: string
  name: string
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const initToken = localStorage.getItem(TOKEN_KEY) || ''
  const userId = localStorage.getItem(USER_ID_KEY)
  const email = localStorage.getItem(EMAIL_KEY) || ''
  const name = localStorage.getItem(NAME_KEY) || ''
  const initUser = userId ? { id: Number(userId), email, name } : null

  return {
    auth: {
      user: initUser,
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
      accessToken: initToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          localStorage.setItem(TOKEN_KEY, accessToken)
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          localStorage.removeItem(TOKEN_KEY)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_ID_KEY)
          localStorage.removeItem(EMAIL_KEY)
          localStorage.removeItem(NAME_KEY)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
    },
  }
})
