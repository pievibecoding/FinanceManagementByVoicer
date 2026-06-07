import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/signout')({
  component: () => {
    const { logout } = useAuth()
    logout()
    return <Navigate to="/sign-in" />
  },
})
