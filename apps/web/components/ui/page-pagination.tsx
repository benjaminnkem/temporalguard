"use client";

import { Spinner } from "@/components/ui/spinner";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function buildPageNumbers(page: number, totalPages: number) {
  const pages: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  if (page > 3) pages.push("ellipsis");
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (page < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export function PagePagination({
  page,
  totalPages,
  total,
  isFetching,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
}) {
  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border/40 px-4 py-3 sm:flex-row">
      <p className="text-xs text-muted-foreground sm:min-w-40">
        Page {page} of {totalPages}
        {isFetching ? (
          <span className="ml-2 inline-flex items-center gap-1">
            <Spinner className="size-3" />
            Updating…
          </span>
        ) : null}
      </p>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={page <= 1 || isFetching}
              className={
                page <= 1 || isFetching
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
              onClick={(e) => {
                e.preventDefault();
                if (page > 1 && !isFetching) onPageChange(page - 1);
              }}
            />
          </PaginationItem>

          {pageNumbers.map((p, idx) =>
            p === "ellipsis" ? (
              <PaginationItem key={`e-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === page}
                  aria-disabled={isFetching}
                  className={
                    isFetching ? "pointer-events-none opacity-50" : undefined
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isFetching) onPageChange(p);
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={page >= totalPages || isFetching || total === 0}
              className={
                page >= totalPages || isFetching || total === 0
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
              onClick={(e) => {
                e.preventDefault();
                if (page < totalPages && !isFetching && total > 0) {
                  onPageChange(page + 1);
                }
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
