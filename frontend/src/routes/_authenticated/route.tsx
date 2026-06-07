import { createFileRoute, Navigate } from '@tanstack/react-router'
import { AuthenticatedLayout } from '../../../components/layout/authenticated-layout'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/_authenticated')({
  component: () => {
    const { isAuthenticated } = useAuth()
    
    if (!isAuthenticated) {
      return <Navigate to="/sign-in" />
    }
    
    return <AuthenticatedLayout />
  },
})
