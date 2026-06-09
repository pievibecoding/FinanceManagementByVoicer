import { useTranslation } from 'react-i18next';
import { useDeleteCategory } from '@/hooks/useCategories';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
}

export function DeleteConfirmationDialog({ open, onOpenChange, categoryId }: DeleteConfirmationDialogProps) {
  const { t } = useTranslation();
  const deleteCategory = useDeleteCategory();

  const handleConfirm = () => {
    if (!categoryId) return;
    deleteCategory.mutate(categoryId, { onSuccess: () => { onOpenChange(false); } });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('categories.deleteTitle')}
      desc={t('categories.deleteDescription')}
      handleConfirm={handleConfirm}
      confirmText={t('common.delete')}
      cancelBtnText={t('common.cancel')}
      isLoading={deleteCategory.isPending}
      destructive
    />
  );
}
