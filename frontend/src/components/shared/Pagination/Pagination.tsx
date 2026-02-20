"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./Pagination.module.scss";

type PaginationProps = {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
};

function calculatePageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (currentPage > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);

  return pages;
}

export function Pagination({ total, limit, offset, onPageChange }: PaginationProps) {
  if (total === 0 || limit <= 0) {
    return null;
  }

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.min(Math.floor(offset / limit) + 1, totalPages);
  const pageNumbers = calculatePageNumbers(currentPage, totalPages);

  const handlePageClick = (page: number) => {
    const newOffset = (page - 1) * limit;
    onPageChange(newOffset);
  };

  return (
    <nav className={styles.container} aria-label="ページネーション">
      <Button
        variant="outline"
        size="icon"
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="前のページへ"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pageNumbers.map((page, position) => {
        if (page === "ellipsis") {
          // position を使うことで、省略記号が複数あっても一意な key を保証する
          const ellipsisKey = `ellipsis-${position}`;
          return (
            <span key={ellipsisKey} className={styles.ellipsis}>
              ...
            </span>
          );
        }

        const isCurrentPage = page === currentPage;

        return (
          <Button
            key={page}
            variant={isCurrentPage ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageClick(page)}
            aria-current={isCurrentPage ? "page" : undefined}
            disabled={isCurrentPage}
          >
            {page}
          </Button>
        );
      })}

      <Button
        variant="outline"
        size="icon"
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="次のページへ"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
