import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useBudgets } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { AddBudgetModal } from '@/components/budgets/AddBudgetModal'
import { EditBudgetModal } from '@/components/budgets/EditBudgetModal'
import { DeleteConfirmationDialog } from '@/components/budgets/DeleteConfirmationDialog'
import type { Budget } from '@/api/budgets'

export const Route = createFileRoute('/_authenticated/budgets/')({
  component: () => {
    const [currentMonth, setCurrentMonth] = useState(() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
    const [deletingBudget, setDeletingBudget] = useState<{ category_id: number; month: string } | null>(null)

    const { data: budgets, isLoading, isError } = useBudgets(currentMonth)
    const { data: categories } = useCategories()

    const handleEdit = (budget: Budget) => {
      setEditingBudget(budget)
    }

    const handleDelete = (budget: Budget) => {
      setDeletingBudget({ category_id: budget.category_id, month: budget.month })
    }

    if (isLoading) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-white">Budgets</h1>
          <div className="text-white/60">Loading...</div>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-white">Budgets</h1>
          <div className="text-[#dd9787]">Error loading budgets</div>
        </div>
      )
    }

    const budgetsWithCategories = budgets?.map(budget => ({
      budget,
      category: categories?.find(c => c.category_id === String(budget.category_id))
    })).filter(item => item.category !== undefined) || []

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Budgets</h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#74d3ae] text-[#1a1a2e] py-2 px-4 rounded-[0.625rem] hover:bg-[#74d3ae]/80 transition-colors font-medium"
          >
            Add Budget
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-white/60 text-sm mb-2">Select Month</label>
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="bg-white/6 border border-white/18 rounded-[0.625rem] p-3 text-white focus:outline-none focus:border-[#74d3ae]"
          />
        </div>

        {!budgetsWithCategories || budgetsWithCategories.length === 0 ? (
          <div className="text-white/60 text-center py-12">
            No budgets found for {currentMonth}. Click "Add Budget" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetsWithCategories.map(({ budget, category }) => (
              <BudgetCard
                key={budget.budget_id}
                budget={budget}
                category={category!}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <AddBudgetModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          month={currentMonth}
        />

        {editingBudget && (
          <EditBudgetModal
            isOpen={!!editingBudget}
            onClose={() => setEditingBudget(null)}
            budget={editingBudget}
          />
        )}

        {deletingBudget && (
          <DeleteConfirmationDialog
            isOpen={!!deletingBudget}
            onClose={() => setDeletingBudget(null)}
            budget={deletingBudget}
          />
        )}
      </div>
    )
  },
})
