import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import BookCard from '../components/BookCard';
import PaginationNav from '../components/PaginationNav';
import SeoHead from '../components/SeoHead';
import api from '../utils/api';
import { buildMeta } from '../utils/seo';

const BOOKS_PER_PAGE = 12;

export default function SearchPage({ query, books, pagination, isFallback }) {
  const router = useRouter();
  const q = query || '';

  const meta = buildMeta({
    title: q ? `Search results for "${q}" | ReadNovaX` : 'Search books | ReadNovaX',
    description: q ? `Browse book search results for ${q} on ReadNovaX.` : 'Search books, chapters, and authors on ReadNovaX.',
    image: '/images/logo.svg',
    path: router.asPath || '/search'
  });

  return (
    <Layout>
      <SeoHead {...meta} noIndex={!q} />
      <h1 className="mb-6 text-3xl font-bold">Search</h1>

      {!q && <p className="mb-4 text-slate-600 dark:text-slate-300">Enter a search term from the top bar to find books.</p>}
      {isFallback && q && (
        <p className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
          Search is taking a little longer while the server wakes up, so we&apos;re showing results as empty for now.
        </p>
      )}

      {q && <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Results for <strong>{q}</strong>: {pagination?.total || books.length}</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {books.map((book) => <BookCard key={book._id} book={book} />)}
      </div>
      {q && books.length === 0 && (
        <div className="rounded-xl border border-dashed p-6 text-center text-slate-500 dark:border-slate-700">
          No books found right now. Try a different keyword in a moment.
        </div>
      )}
      {!q && (
        <div className="mt-6 rounded-xl border border-dashed p-6 text-center text-slate-500 dark:border-slate-700">
          Start typing a title, author, or category in search.
        </div>
      )}
      {q && <PaginationNav pagination={pagination} basePath="/search" limit={BOOKS_PER_PAGE} />}
      <div className="mt-6">
        <Link href="/" className="rounded border px-4 py-2">← Back to home</Link>
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ query }) {
  const q = (query.q || '').toString().trim();

  if (!q) {
    return { props: { query: '', books: [], pagination: null, isFallback: false } };
  }

  try {
    const { data } = await api.get('/books', {
      params: {
        search: q,
        page: query.page || 1,
        limit: query.limit || BOOKS_PER_PAGE
      }
    });
    return { props: { query: q, books: data.data || [], pagination: data.pagination || null, isFallback: false } };
  } catch (_error) {
    return { props: { query: q, books: [], pagination: null, isFallback: true } };
  }
}
