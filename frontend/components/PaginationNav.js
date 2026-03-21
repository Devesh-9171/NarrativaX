import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/router';

function buildPageList(currentPage, totalPages) {
  if (totalPages <= 1) return [1];

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export default function PaginationNav({ pagination, basePath, limit = 12 }) {
  const router = useRouter();

  const pages = useMemo(
    () => buildPageList(pagination?.page || 1, pagination?.totalPages || 1),
    [pagination?.page, pagination?.totalPages]
  );

  if (!pagination || pagination.totalPages <= 1) return null;

  const buildHref = (page) => ({
    pathname: basePath,
    query: {
      ...router.query,
      page,
      limit
    }
  });

  const items = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const prev = pages[index - 1];

    if (typeof prev !== 'undefined' && page - prev > 1) {
      items.push(`ellipsis-${page}`);
    }

    items.push(page);
  }

  const buttonClassName = 'inline-flex min-w-[2.75rem] items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition hover:border-brand-400 hover:text-brand-600 dark:hover:border-sky-400 dark:hover:text-sky-300';

  return (
    <nav className="mt-8 space-y-3" aria-label="Pagination">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
        <Link
          href={buildHref(Math.max(1, pagination.page - 1))}
          aria-disabled={!pagination.hasPrevPage}
          className={`${buttonClassName} ${pagination.hasPrevPage ? 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900' : 'pointer-events-none border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600'}`}
        >
          ← Previous
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {items.map((item) => (
            typeof item === 'number' ? (
              <Link
                key={item}
                href={buildHref(item)}
                aria-current={item === pagination.page ? 'page' : undefined}
                className={`${buttonClassName} ${item === pagination.page ? 'border-brand-600 bg-brand-600 text-white shadow-sm dark:border-sky-400 dark:bg-sky-400 dark:text-slate-950' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
              >
                {item}
              </Link>
            ) : (
              <span key={item} className="px-1 text-sm text-slate-400 dark:text-slate-500">…</span>
            )
          ))}
        </div>

        <Link
          href={buildHref(Math.min(pagination.totalPages, pagination.page + 1))}
          aria-disabled={!pagination.hasNextPage}
          className={`${buttonClassName} ${pagination.hasNextPage ? 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900' : 'pointer-events-none border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600'}`}
        >
          Next →
        </Link>
      </div>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Page {pagination.page} of {pagination.totalPages} · {pagination.total.toLocaleString()} books
      </p>
    </nav>
  );
}
