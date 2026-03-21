import Layout from '../../components/Layout';
import BookCard from '../../components/BookCard';
import PaginationNav from '../../components/PaginationNav';
import SeoHead from '../../components/SeoHead';
import api from '../../utils/api';
import { buildMeta } from '../../utils/seo';

const BOOKS_PER_PAGE = 12;

export default function CategoryPage({ slug, books, pagination, isFallback }) {
  const meta = buildMeta({
    title: `${slug} Books | ReadNovaX`,
    description: `Browse ${slug} novels and books on ReadNovaX`,
    image: '/images/logo.svg',
    path: pagination?.page > 1 ? `/category/${slug}?page=${pagination.page}&limit=${pagination.limit}` : `/category/${slug}`
  });

  return (
    <Layout>
      <SeoHead {...meta} />
      <h1 className="mb-6 text-3xl font-bold capitalize">{slug} Books</h1>
      {isFallback && (
        <p className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
          This shelf is still loading while the backend wakes up. Please check back in a moment.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {books.map((book) => <BookCard key={book._id} book={book} />)}
      </div>

      {books.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No books are available in this category yet.
        </div>
      )}

      <PaginationNav pagination={pagination} basePath={`/category/${slug}`} limit={BOOKS_PER_PAGE} />
    </Layout>
  );
}

export async function getServerSideProps({ params, query }) {
  try {
    const { data } = await api.get(`/books/category/${params.slug}`, {
      params: { page: query.page || 1, limit: query.limit || BOOKS_PER_PAGE }
    });

    return { props: { slug: params.slug, books: data.data || [], pagination: data.pagination || null, isFallback: false } };
  } catch (_error) {
    return { props: { slug: params.slug, books: [], pagination: null, isFallback: true } };
  }
}
