import { createFileRoute, Navigate } from '@tanstack/react-router'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/sign-up')({
  component: () => {
    const { isAuthenticated } = useAuth()
    
    if (isAuthenticated) {
      return <Navigate to="/_authenticated" />
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          <RegisterForm onSwitchToLogin={() => window.location.href = '/sign-in'} />
        </div>
      </div>
    )
  },
})
