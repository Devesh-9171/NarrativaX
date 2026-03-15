import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import BookCard from '../components/BookCard';
import SeoHead from '../components/SeoHead';
import api from '../utils/api';
import { buildMeta } from '../utils/seo';

export default function SearchPage({ query, books, error }) {
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

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 p-4 text-red-600">{error}</p>
      ) : (
        <>
          {q && <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Results for <strong>{q}</strong>: {books.length}</p>}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {books.map((book) => <BookCard key={book._id} book={book} />)}
          </div>
          {q && books.length === 0 && (
            <div className="rounded-xl border border-dashed p-6 text-center text-slate-500 dark:border-slate-700">
              No books found. Try a different keyword.
            </div>
          )}
          {!q && (
            <div className="mt-6 rounded-xl border border-dashed p-6 text-center text-slate-500 dark:border-slate-700">
              Start typing a title, author, or category in search.
            </div>
          )}
          <div className="mt-6">
            <Link href="/" className="rounded border px-4 py-2">← Back to home</Link>
          </div>
        </>
      )}
    </Layout>
  );
}

export async function getServerSideProps({ query }) {
  const q = (query.q || '').toString().trim();

  if (!q) {
    return { props: { query: '', books: [], error: null } };
  }

  try {
    const { data } = await api.get('/books', { params: { search: q, limit: 24 } });
    return { props: { query: q, books: data.data || [], error: null } };
  } catch (error) {
    return { props: { query: q, books: [], error: error.message } };
  }
}
