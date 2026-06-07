import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/transactions/')({
  component: () => {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Transactions</h1>
        <p>Transactions page - Coming Soon</p>
      </div>
    )
  },
})
