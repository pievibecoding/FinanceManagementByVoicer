interface FilterPanelProps {
  filters: {
    startDate?: string;
    endDate?: string;
    type?: string;
    categoryId?: string;
    accountId?: string;
    search?: string;
  };
  onFiltersChange: (filters: FilterPanelProps['filters']) => void;
  onClearFilters: () => void;
}

export function FilterPanel({ filters, onFiltersChange, onClearFilters }: FilterPanelProps) {
  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm mb-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-white/60 text-sm mb-1">Search</label>
          <input
            type="text"
            placeholder="Search transactions..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/18 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#74d3ae]"
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-white/60 text-sm mb-1">Start Date</label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/18 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#74d3ae]"
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-white/60 text-sm mb-1">End Date</label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/18 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#74d3ae]"
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-white/60 text-sm mb-1">Type</label>
          <select
            value={filters.type || ''}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || undefined })}
            className="w-full px-3 py-2 bg-white/10 border border-white/18 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#74d3ae]"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="investment">Investment</option>
          </select>
        </div>

        <button
          onClick={onClearFilters}
          className="px-4 py-2 bg-white/10 border border-white/18 rounded-lg text-white hover:bg-white/20 transition-all"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
