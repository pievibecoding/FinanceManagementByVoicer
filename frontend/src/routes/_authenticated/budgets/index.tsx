import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/budgets/')({
  component: () => {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Budgets</h1>
        <p>Budgets page - Coming Soon</p>
      </div>
    )
  },
})
