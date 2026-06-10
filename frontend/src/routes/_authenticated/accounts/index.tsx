import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AddAccountModal } from '@/components/accounts/AddAccountModal'
import { EditAccountModal } from '@/components/accounts/EditAccountModal'
import { DeleteConfirmationDialog } from '@/components/accounts/DeleteConfirmationDialog'
import type { Account } from '@/api/accounts'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageHeader } from '@/components/common'

export const Route = createFileRoute('/_authenticated/accounts/')({
  component: () => {
    const { t } = useTranslation()
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
    const [deleteAccountId, setDeleteAccountId] = useState<number | null>(null)

    const { data: accounts, isLoading, isError } = useAccounts()

    const handleEdit = (account: Account) => {
      setSelectedAccount(account)
      setEditModalOpen(true)
    }

    const handleDelete = (accountId: number) => {
      setDeleteAccountId(accountId)
      setDeleteDialogOpen(true)
    }

    if (isLoading) {
      return (
        <div className="p-6">
          <PageHeader title={t('accounts.title')} />
          <div className="mt-4 text-muted-foreground">{t('common.loading')}</div>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="p-6">
          <PageHeader title={t('accounts.title')} />
          <ErrorState className="mt-4" title={t('accounts.error')} />
        </div>
      )
    }

    return (
      <div className="p-6">
        <PageHeader
          className="mb-6"
          title={t('accounts.title')}
          actions={<Button onClick={() => setAddModalOpen(true)}>{t('accounts.add')}</Button>}
        />

        {accounts && accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <AccountCard key={account.account_id} account={account} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <EmptyState title={t('accounts.empty')} />
        )}

        <AddAccountModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
        />

        <EditAccountModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          account={selectedAccount}
        />

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          accountId={deleteAccountId}
        />
      </div>
    )
  },
})
