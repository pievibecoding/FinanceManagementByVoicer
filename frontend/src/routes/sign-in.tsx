import { createFileRoute, Navigate } from '@tanstack/react-router'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/sign-in')({
  component: () => {
    const { isAuthenticated } = useAuth()
    
    if (isAuthenticated) {
      return <Navigate to="/_authenticated" />
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          <LoginForm onSwitchToRegister={() => window.location.href = '/sign-up'} />
        </div>
      </div>
    )
  },
})
