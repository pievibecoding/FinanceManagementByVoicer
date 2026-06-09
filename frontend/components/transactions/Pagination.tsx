interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  const btnBase = 'px-3 py-2 rounded-lg transition-all';

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
        className={`${btnBase} bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed`}>
        Previous
      </button>

      {getPageNumbers().map((page, index) =>
        typeof page === 'number' ? (
          <button key={index} onClick={() => onPageChange(page)}
            className={`${btnBase} ${
              currentPage === page
                ? 'bg-primary text-primary-foreground border border-primary'
                : 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80'
            }`}>
            {page}
          </button>
        ) : (
          <span key={index} className="px-3 py-2 text-muted-foreground">{page}</span>
        )
      )}

      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
        className={`${btnBase} bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed`}>
        Next
      </button>
    </div>
  );
}
