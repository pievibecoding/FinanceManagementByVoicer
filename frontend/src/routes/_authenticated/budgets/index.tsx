import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useBudgets } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { AddBudgetModal } from '@/components/budgets/AddBudgetModal'
import { EditBudgetModal } from '@/components/budgets/EditBudgetModal'
import { DeleteConfirmationDialog } from '@/components/budgets/DeleteConfirmationDialog'
import type { Budget } from '@/api/budgets'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_authenticated/budgets/')({
  component: () => {
    const { t } = useTranslation()
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
          <h1 className="text-2xl font-bold mb-4 text-foreground">{t('budgets.title')}</h1>
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-foreground">{t('budgets.title')}</h1>
          <div className="text-destructive">{t('budgets.error')}</div>
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
          <h1 className="text-2xl font-bold text-foreground">{t('budgets.title')}</h1>
          <button onClick={() => setIsAddModalOpen(true)}
            className="bg-primary text-primary-foreground py-2 px-4 rounded-[var(--radius)] hover:bg-primary/80 transition-colors font-medium">
            {t('budgets.add')}
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-muted-foreground text-sm mb-2">{t('budgets.selectMonth')}</label>
          <input type="month" value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)}
            className="bg-input border border-border rounded-[var(--radius)] p-3 text-foreground focus:outline-none focus:border-primary" />
        </div>

        {!budgetsWithCategories || budgetsWithCategories.length === 0 ? (
          <div className="text-muted-foreground text-center py-12">
            {t('budgets.empty', { month: currentMonth })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetsWithCategories.map(({ budget, category }) => (
              <BudgetCard key={budget.budget_id} budget={budget} category={category!} onEdit={handleEdit} onDelete={handleDelete} />
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
