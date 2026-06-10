import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { CategoryCard } from '@/components/categories/CategoryCard'
import { AddCategoryModal } from '@/components/categories/AddCategoryModal'
import { EditCategoryModal } from '@/components/categories/EditCategoryModal'
import { DeleteConfirmationDialog } from '@/components/categories/DeleteConfirmationDialog'
import type { Category } from '@/api/categories'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageHeader } from '@/components/common'

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
          <PageHeader title={t('categories.title')} />
          <div className="mt-4 text-muted-foreground">{t('common.loading')}</div>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="p-6">
          <PageHeader title={t('categories.title')} />
          <ErrorState className="mt-4" title={t('categories.error')} />
        </div>
      )
    }

    return (
      <div className="p-6">
        <PageHeader
          className="mb-6"
          title={t('categories.title')}
          actions={<Button onClick={() => setAddModalOpen(true)}>{t('categories.add')}</Button>}
        />

        {categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <CategoryCard key={category.category_id} category={category} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <EmptyState title={t('categories.empty')} />
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
