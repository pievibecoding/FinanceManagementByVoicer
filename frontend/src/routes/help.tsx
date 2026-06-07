import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/help')({
  component: () => {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Help Center</h1>
        <p>Help Center page - Coming Soon</p>
      </div>
    )
  },
})
