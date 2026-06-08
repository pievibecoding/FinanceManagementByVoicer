import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { FilterPanel } from '@/components/transactions/FilterPanel'
import { TransactionTable } from '@/components/transactions/TransactionTable'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { EditTransactionModal } from '@/components/transactions/EditTransactionModal'
import { DeleteConfirmationDialog } from '@/components/transactions/DeleteConfirmationDialog'
import { TransactionDetailsView } from '@/components/transactions/TransactionDetailsView'
import { Pagination } from '@/components/transactions/Pagination'
import type { Transaction } from '@/api/transactions'

export const Route = createFileRoute('/_authenticated/transactions/')({
  component: TransactionsPage,
})

function TransactionsPage() {
  const [filters, setFilters] = useState<{
    startDate?: string
    endDate?: string
    type?: string
    search?: string
  }>({})

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

  const filtered = useMemo(() => {
    let list = allTransactions
    if (filters.type) list = list.filter(t => t.type === filters.type)
    if (filters.startDate) list = list.filter(t => t.transaction_date >= filters.startDate!)
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

  const handleFiltersChange = (f: typeof filters) => {
    setFilters(f)
    setCurrentPage(1)
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
        <h1 className="text-2xl font-bold mb-4 text-white">Giao dịch</h1>
        <div className="text-white/60">Đang tải...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Giao dịch</h1>
        <div className="text-[#dd9787]">Lỗi tải dữ liệu</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Giao dịch</h1>
        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2 bg-[#74d3ae] border border-[#74d3ae] rounded-lg text-white hover:bg-[#74d3ae]/80 transition-all"
        >
          + Thêm giao dịch
        </button>
      </div>

      <FilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={() => { setFilters({}); setCurrentPage(1) }}
      />

      <TransactionTable
        transactions={paginated}
        categories={categories}
        onEdit={(t) => { setSelectedTransaction(t); setEditModalOpen(true) }}
        onDelete={(id) => { setDeleteTransactionId(id); setDeleteDialogOpen(true) }}
        onViewDetails={handleViewDetails}
      />

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
