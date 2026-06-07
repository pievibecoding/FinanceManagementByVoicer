import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: () => {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p>Settings page - Coming Soon</p>
      </div>
    )
  },
})
