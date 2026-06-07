import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/settings/notifications')({
  component: () => {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <p>Notifications settings page - Coming Soon</p>
      </div>
    )
  },
})
