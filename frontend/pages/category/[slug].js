import Link from 'next/link';
import Layout from '../../components/Layout';
import BookCard from '../../components/BookCard';
import SeoHead from '../../components/SeoHead';
import api from '../../utils/api';
import { buildMeta } from '../../utils/seo';

export default function CategoryPage({ slug, books, pagination, error }) {
  const meta = buildMeta({
    title: `${slug} Books | ReadNovaX`,
    description: `Browse ${slug} novels and books on ReadNovaX`,
    image: '/images/logo.svg',
    path: `/category/${slug}`
  });

  return (
    <Layout>
      <SeoHead {...meta} />
      <h1 className="mb-6 text-3xl font-bold capitalize">{slug} Books</h1>
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 p-4 text-red-600">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {books.map((book) => <BookCard key={book._id} book={book} />)}
          </div>

          <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
            {pagination?.hasPrevPage ? (
              <Link href={`/category/${slug}?page=${pagination.page - 1}`} className="rounded border px-4 py-2">← Previous</Link>
            ) : <span />}
            <p className="text-sm text-slate-600">Page {pagination?.page || 1} of {pagination?.totalPages || 1}</p>
            {pagination?.hasNextPage ? (
              <Link href={`/category/${slug}?page=${pagination.page + 1}`} className="rounded border px-4 py-2">Next →</Link>
            ) : <span />}
          </nav>
        </>
      )}
    </Layout>
  );
}

export async function getServerSideProps({ params, query }) {
  try {
    const { data } = await api.get(`/books/category/${params.slug}`, {
      params: { page: query.page || 1, limit: 24 }
    });

    return { props: { slug: params.slug, books: data.data, pagination: data.pagination } };
  } catch (error) {
    return { props: { slug: params.slug, books: [], pagination: null, error: error.message } };
  }
}
