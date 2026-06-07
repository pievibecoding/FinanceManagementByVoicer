import { createFileRoute, Navigate } from '@tanstack/react-router'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/sign-up')({
  component: () => {
    const { isAuthenticated } = useAuth()
    
    if (isAuthenticated) {
      return <Navigate to="/" />
    }
    
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          {clientId ? (
            <GoogleOAuthProvider clientId={clientId}>
              <RegisterForm onSwitchToLogin={() => window.location.href = '/sign-in'} />
            </GoogleOAuthProvider>
          ) : (
            <RegisterForm onSwitchToLogin={() => window.location.href = '/sign-in'} />
          )}
        </div>
      </div>
    )
  },
})
