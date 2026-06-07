import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/accounts/')({
  component: () => {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Accounts</h1>
        <p>Accounts page - Coming Soon</p>
      </div>
    )
  },
})
