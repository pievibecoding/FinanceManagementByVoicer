import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/categories/')({
  component: () => {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Categories</h1>
        <p>Categories page - Coming Soon</p>
      </div>
    )
  },
})
