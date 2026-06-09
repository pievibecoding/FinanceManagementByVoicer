import { useTranslation } from 'react-i18next';
import { useDeleteAccount } from '@/hooks/useAccounts';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: number | null;
}

export function DeleteConfirmationDialog({ open, onOpenChange, accountId }: DeleteConfirmationDialogProps) {
  const { t } = useTranslation();
  const deleteAccount = useDeleteAccount();

  const handleConfirm = () => {
    if (!accountId) return;
    deleteAccount.mutate(accountId, { onSuccess: () => { onOpenChange(false); } });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('accounts.deleteTitle')}
      desc={t('accounts.deleteDescription')}
      handleConfirm={handleConfirm}
      confirmText={t('common.delete')}
      cancelBtnText={t('common.cancel')}
      isLoading={deleteAccount.isPending}
      destructive
    />
  );
}
