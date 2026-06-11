import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { FilterPanel } from '@/components/transactions/FilterPanel'
import { TransactionTable } from '@/components/transactions/TransactionTable'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { EditTransactionModal } from '@/components/transactions/EditTransactionModal'
import { DeleteConfirmationDialog } from '@/components/transactions/DeleteConfirmationDialog'
import { TransactionDetailsView } from '@/components/transactions/TransactionDetailsView'
import { Pagination } from '@/components/transactions/Pagination'
import type { Transaction } from '@/api/transactions'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageHeader } from '@/components/common'
import { isTransactionTypeOption } from '@/lib/transaction-types'

export const Route = createFileRoute('/_authenticated/transactions/')({
  validateSearch: (search: Record<string, unknown>) => ({
    types: typeof search.types === 'string' ? search.types : undefined,
    categories: typeof search.categories === 'string' ? search.categories : undefined,
    accounts: typeof search.accounts === 'string' ? search.accounts : undefined,
    start: typeof search.start === 'string' ? search.start : undefined,
    end: typeof search.end === 'string' ? search.end : undefined,
    min: typeof search.min === 'string' ? search.min : undefined,
    max: typeof search.max === 'string' ? search.max : undefined,
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  component: TransactionsPage,
})

type TransactionFilterState = {
  startDate?: string
  endDate?: string
  types: string[]
  categoryIds: string[]
  accountIds: string[]
  minAmount?: number
  maxAmount?: number
  search?: string
}

function splitParam(value?: string) {
  return value ? Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean))) : []
}

function joinParam(values: string[]) {
  return values.length > 0 ? values.join(',') : undefined
}

function numberParam(value?: string) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function TransactionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const filters: TransactionFilterState = {
    startDate: search.start,
    endDate: search.end,
    types: splitParam(search.types).filter(isTransactionTypeOption),
    categoryIds: splitParam(search.categories),
    accountIds: splitParam(search.accounts),
    minAmount: numberParam(search.min),
    maxAmount: numberParam(search.max),
    search: search.q,
  }

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)         // ← separate open state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const { data: allTransactions = [], isLoading, isError } = useTransactions()
  const { data: categories = [] } = useCategories()
  const { data: accounts = [] } = useAccounts()
  const amountBounds = useMemo(() => {
    const max = Math.max(0, ...allTransactions.map((transaction) => transaction.amount))
    return { min: 0, max }
  }, [allTransactions])

  const filtered = useMemo(() => {
    let list = allTransactions
    if (filters.types.length > 0) list = list.filter(t => filters.types.includes(t.type))
    if (filters.categoryIds.length > 0) list = list.filter(t => filters.categoryIds.includes(String(t.category_id)))
    if (filters.accountIds.length > 0) list = list.filter(t => filters.accountIds.includes(String(t.account_id)))
    if (filters.minAmount !== undefined) list = list.filter(t => t.amount >= filters.minAmount!)
    if (filters.maxAmount !== undefined) list = list.filter(t => t.amount <= filters.maxAmount!)
    if (filters.startDate) list = list.filter(t => t.transaction_date.slice(0, 10) >= filters.startDate!)
    if (filters.endDate) list = list.filter(t => t.transaction_date.slice(0, 10) <= filters.endDate!)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(t =>
        t.note?.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      )
    }
    return list
  }, [allTransactions, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleFiltersChange = (f: TransactionFilterState) => {
    setCurrentPage(1)
    navigate({
      to: '/transactions',
      search: {
        types: joinParam(f.types),
        categories: joinParam(f.categoryIds),
        accounts: joinParam(f.accountIds),
        start: f.startDate || undefined,
        end: f.endDate || undefined,
        min: f.minAmount !== undefined ? String(f.minAmount) : undefined,
        max: f.maxAmount !== undefined ? String(f.maxAmount) : undefined,
        q: f.search?.trim() || undefined,
      },
      replace: true,
    })
  }

  const handleClearFilters = () => {
    setCurrentPage(1)
    navigate({
      to: '/transactions',
      search: {},
      replace: true,
    })
  }

  const handleViewDetails = (t: Transaction) => {
    setSelectedTransaction(t)
    setDetailsOpen(true)
  }

  const handleEditFromDetails = (t: Transaction) => {
    setDetailsOpen(false)          // close details first
    setSelectedTransaction(t)
    setEditModalOpen(true)         // then open edit
  }

  const handleDeleteFromDetails = (id: string) => {
    setDetailsOpen(false)          // close details first
    setDeleteTransactionId(id)
    setDeleteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title={t('transactions.title')} />
        <div className="mt-4 text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <PageHeader title={t('transactions.title')} />
        <ErrorState className="mt-4" title={t('transactions.error')} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        className="mb-6"
        title={t('transactions.title')}
        actions={(
          <Button onClick={() => setAddModalOpen(true)}>
            + {t('transactions.add')}
          </Button>
        )}
      />

      <FilterPanel
        filters={filters}
        categories={categories}
        accounts={accounts}
        amountBounds={amountBounds}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {filtered.length === 0 ? (
        <EmptyState title={t('transactions.empty')} />
      ) : (
        <TransactionTable
          transactions={paginated}
          categories={categories}
          onEdit={(t) => { setSelectedTransaction(t); setEditModalOpen(true) }}
          onDelete={(id) => { setDeleteTransactionId(id); setDeleteDialogOpen(true) }}
          onViewDetails={handleViewDetails}
        />
      )}

      {filtered.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <AddTransactionModal open={addModalOpen} onOpenChange={setAddModalOpen} />
      <EditTransactionModal open={editModalOpen} onOpenChange={setEditModalOpen} transaction={selectedTransaction} />
      <DeleteConfirmationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} transactionId={deleteTransactionId} />

      {/* DetailsView uses its own open state so it doesn't conflict with EditModal */}
      {detailsOpen && (
        <TransactionDetailsView
          transaction={selectedTransaction}
          onClose={() => setDetailsOpen(false)}
          onEdit={handleEditFromDetails}
          onDelete={handleDeleteFromDetails}
        />
      )}
    </div>
  )
}
