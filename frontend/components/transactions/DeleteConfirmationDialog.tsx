import { useDeleteTransaction } from '@/hooks/useTransactions';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
}

export function DeleteConfirmationDialog({ open, onOpenChange, transactionId }: DeleteConfirmationDialogProps) {
  const deleteTransaction = useDeleteTransaction();

  const handleConfirm = () => {
    if (!transactionId) return;
    
    deleteTransaction.mutate(transactionId, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Transaction"
      desc="Are you sure you want to delete this transaction? This action cannot be undone."
      handleConfirm={handleConfirm}
      confirmText="Delete"
      cancelBtnText="Cancel"
      isLoading={deleteTransaction.isPending}
      destructive
    />
  );
}
