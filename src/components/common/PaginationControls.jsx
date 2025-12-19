import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';

const PaginationControls = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  const goToPrevious = () => onPageChange(Math.max(1, currentPage - 1));
  const goToNext = () => onPageChange(Math.min(totalPages, currentPage + 1));

  return (
    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
      <span className="text-xs text-gray-500">
        Página {currentPage} de {totalPages} ({totalItems} itens)
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={goToPrevious}
          disabled={currentPage === 1}
          className="px-3 py-1 h-8 text-xs"
        >
          <ChevronLeft size={14} /> Anterior
        </Button>
        <Button
          variant="secondary"
          onClick={goToNext}
          disabled={currentPage === totalPages}
          className="px-3 py-1 h-8 text-xs"
        >
          Próxima <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
