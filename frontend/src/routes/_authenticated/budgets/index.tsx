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
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageHeader } from '@/components/common'

function normalizeId(value: string | number | null | undefined) {
  return value == null ? '' : String(value)
}

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
          <PageHeader title={t('budgets.title')} />
          <div className="mt-4 text-muted-foreground">{t('common.loading')}</div>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="p-6">
          <PageHeader title={t('budgets.title')} />
          <ErrorState className="mt-4" title={t('budgets.error')} />
        </div>
      )
    }

    const budgetsWithCategories = budgets?.map(budget => ({
      budget,
      category: categories?.find(c => normalizeId(c.category_id) === normalizeId(budget.category_id))
    })).filter(item => item.category !== undefined) || []

    return (
      <div className="p-6">
        <PageHeader
          className="mb-6"
          title={t('budgets.title')}
          actions={<Button onClick={() => setIsAddModalOpen(true)}>{t('budgets.add')}</Button>}
        />

        <div className="mb-6">
          <label className="block text-muted-foreground text-sm mb-2">{t('budgets.selectMonth')}</label>
          <input type="month" value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)}
            className="bg-input border border-border rounded-[var(--radius)] p-3 text-foreground focus:outline-none focus:border-primary" />
        </div>

        {!budgetsWithCategories || budgetsWithCategories.length === 0 ? (
          <EmptyState title={t('budgets.empty', { month: currentMonth })} />
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
