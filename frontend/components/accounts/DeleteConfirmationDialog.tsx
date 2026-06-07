import { useDeleteAccount } from '@/hooks/useAccounts';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: number | null;
}

export function DeleteConfirmationDialog({ open, onOpenChange, accountId }: DeleteConfirmationDialogProps) {
  const deleteAccount = useDeleteAccount();

  const handleConfirm = () => {
    if (!accountId) return;
    
    deleteAccount.mutate(accountId, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Account"
      desc="Are you sure you want to delete this account? This action cannot be undone."
      handleConfirm={handleConfirm}
      confirmText="Delete"
      cancelBtnText="Cancel"
      isLoading={deleteAccount.isPending}
      destructive
    />
  );
}
