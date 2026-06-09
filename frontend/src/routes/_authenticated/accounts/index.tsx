import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AddAccountModal } from '@/components/accounts/AddAccountModal'
import { EditAccountModal } from '@/components/accounts/EditAccountModal'
import { DeleteConfirmationDialog } from '@/components/accounts/DeleteConfirmationDialog'
import type { Account } from '@/api/accounts'
import { useTranslation } from 'react-i18next'

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
          <h1 className="text-2xl font-bold mb-4 text-foreground">{t('accounts.title')}</h1>
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-foreground">{t('accounts.title')}</h1>
          <div className="text-destructive">{t('accounts.error')}</div>
        </div>
      )
    }

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('accounts.title')}</h1>
          <button onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 bg-primary rounded-lg text-primary-foreground hover:bg-primary/80 transition-all">
            {t('accounts.add')}
          </button>
        </div>

        {accounts && accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <AccountCard key={account.account_id} account={account} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-[var(--radius)] p-8 text-center text-muted-foreground">
            {t('accounts.empty')}
          </div>
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
