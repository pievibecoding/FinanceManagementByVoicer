import { useDeleteTransaction } from '@/hooks/useTransactions';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
}

export function DeleteConfirmationDialog({ open, onOpenChange, transactionId }: DeleteConfirmationDialogProps) {
  const { t } = useTranslation();
  const deleteTransaction = useDeleteTransaction();

  const handleConfirm = () => {
    if (!transactionId) return;

    deleteTransaction.mutate(transactionId, {
      onSuccess: () => {
        onOpenChange(false);
      },
      onError: (error) => {
        console.error('Delete failed:', error);
        alert(`${t('transactions.deleteFailed')}: ${error.message}`);
      },
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('transactions.deleteTitle')}
      desc={t('transactions.deleteDescription')}
      handleConfirm={handleConfirm}
      confirmText={t('common.delete')}
      cancelBtnText={t('common.cancel')}
      isLoading={deleteTransaction.isPending}
      destructive
    />
  );
}
