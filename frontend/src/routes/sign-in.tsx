import { createFileRoute, Navigate } from '@tanstack/react-router'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/contexts/AuthContext'
import { AppCard } from '@/components/common'

export const Route = createFileRoute('/sign-in')({
  component: () => {
    const { isAuthenticated } = useAuth()
    
    if (isAuthenticated) {
      return <Navigate to="/" />
    }
    
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AppCard className="w-full max-w-md rounded-[var(--radius)] p-6">
          {clientId ? (
            <GoogleOAuthProvider clientId={clientId}>
              <LoginForm onSwitchToRegister={() => window.location.href = '/sign-up'} />
            </GoogleOAuthProvider>
          ) : (
            <LoginForm onSwitchToRegister={() => window.location.href = '/sign-up'} />
          )}
        </AppCard>
      </div>
    )
  },
})
