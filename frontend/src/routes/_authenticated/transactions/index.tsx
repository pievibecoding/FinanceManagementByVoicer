import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { FilterPanel } from '@/components/transactions/FilterPanel'
import { TransactionTable } from '@/components/transactions/TransactionTable'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { EditTransactionModal } from '@/components/transactions/EditTransactionModal'
import { DeleteConfirmationDialog } from '@/components/transactions/DeleteConfirmationDialog'
import { TransactionDetailsView } from '@/components/transactions/TransactionDetailsView'
import { Pagination } from '@/components/transactions/Pagination'
import type { Transaction } from '@/api/transactions'

export const Route = createFileRoute('/_authenticated/transactions/')({
  component: () => {
    const [filters, setFilters] = useState<{
      startDate?: string
      endDate?: string
      type?: string
      categoryId?: string
      accountId?: string
      search?: string
    }>({})

    const [addModalOpen, setAddModalOpen] = useState(false)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [detailsViewOpen, setDetailsViewOpen] = useState(false)
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
    const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const { data: transactions, isLoading, isError } = useTransactions(filters)

    const handleClearFilters = () => {
      setFilters({})
    }

    const handleEdit = (transaction: Transaction) => {
      setSelectedTransaction(transaction)
      setEditModalOpen(true)
    }

    const handleDelete = (transactionId: string) => {
      setDeleteTransactionId(transactionId)
      setDeleteDialogOpen(true)
    }

    const handleViewDetails = (transaction: Transaction) => {
      setSelectedTransaction(transaction)
      setDetailsViewOpen(true)
    }

    const totalPages = transactions ? Math.ceil(transactions.length / itemsPerPage) : 1
    const paginatedTransactions = transactions?.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    ) || []

    if (isLoading) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-white">Transactions</h1>
          <div className="text-white/60">Loading...</div>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-white">Transactions</h1>
          <div className="text-[#dd9787]">Error loading transactions</div>
        </div>
      )
    }

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 bg-[#74d3ae] border border-[#74d3ae] rounded-lg text-white hover:bg-[#74d3ae]/80 transition-all"
          >
            Add Transaction
          </button>
        </div>

        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
        />

        <TransactionTable
          transactions={paginatedTransactions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
        />

        {transactions && transactions.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

        <AddTransactionModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
        />

        <EditTransactionModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          transaction={selectedTransaction}
        />

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          transactionId={deleteTransactionId}
        />

        <TransactionDetailsView
          transaction={selectedTransaction}
          onClose={() => setDetailsViewOpen(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    )
  },
})
