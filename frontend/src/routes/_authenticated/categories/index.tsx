import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { CategoryCard } from '@/components/categories/CategoryCard'
import { AddCategoryModal } from '@/components/categories/AddCategoryModal'
import { EditCategoryModal } from '@/components/categories/EditCategoryModal'
import { DeleteConfirmationDialog } from '@/components/categories/DeleteConfirmationDialog'
import type { Category } from '@/api/categories'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_authenticated/categories/')({
  component: () => {
    const { t } = useTranslation()
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
    const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)

    const { data: categories, isLoading, isError } = useCategories()

    const handleEdit = (category: Category) => {
      setSelectedCategory(category)
      setEditModalOpen(true)
    }

    const handleDelete = (categoryId: string) => {
      setDeleteCategoryId(categoryId)
      setDeleteDialogOpen(true)
    }

    if (isLoading) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-foreground">{t('categories.title')}</h1>
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-foreground">{t('categories.title')}</h1>
          <div className="text-destructive">{t('categories.error')}</div>
        </div>
      )
    }

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('categories.title')}</h1>
          <button onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 bg-primary rounded-lg text-primary-foreground hover:bg-primary/80 transition-all">
            {t('categories.add')}
          </button>
        </div>

        {categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <CategoryCard key={category.category_id} category={category} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-[var(--radius)] p-8 text-center text-muted-foreground">
            {t('categories.empty')}
          </div>
        )}

        <AddCategoryModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
        />

        <EditCategoryModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          category={selectedCategory}
        />

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          categoryId={deleteCategoryId}
        />
      </div>
    )
  },
})
