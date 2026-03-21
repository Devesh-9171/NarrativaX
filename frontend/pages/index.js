import Link from 'next/link';
import Layout from '../components/Layout';
import BookCard from '../components/BookCard';
import PaginationNav from '../components/PaginationNav';
import SeoHead from '../components/SeoHead';
import api from '../utils/api';
import { buildMeta } from '../utils/seo';

const BOOKS_PER_PAGE = 12;

export default function Home({ data, categories, latestBooks, latestBooksPagination, isFallback }) {
  const meta = buildMeta({
    title: 'ReadNovaX - Read trending novels online',
    description: 'Discover trending books, latest chapters, and immersive reading on ReadNovaX.',
    image: '/images/logo.svg',
    path: latestBooksPagination?.page > 1 ? `/?page=${latestBooksPagination.page}&limit=${latestBooksPagination.limit}` : '/'
  });

  const animatedTitle = 'Welcome to ReadNovaX';

  return (
    <Layout>
      <SeoHead {...meta} />
      <section className="brand-hero mb-8 rounded-2xl p-8 text-white">
        <h1 className="hero-title mb-2 text-3xl font-bold sm:text-4xl">
          {animatedTitle.split('').map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="hero-letter"
              style={{ animationDelay: `${index * 0.04}s` }}
              aria-hidden="true"
            >
              {letter === ' ' ? ' ' : letter}
            </span>
          ))}
          <span className="sr-only">{animatedTitle}</span>
        </h1>
        <p className="mb-5 max-w-2xl">Featured novels updated daily with clean reading, bookmarks, and personalized progress.</p>
        <Link href="/category/action" className="rounded bg-white px-4 py-2 font-semibold text-blue-700">Start Reading</Link>
      </section>


      {isFallback && (
        <p className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
          We&apos;re waking up the library right now. Content will appear automatically on your next refresh.
        </p>
      )}

      <Section title="Featured Novels" books={data.featured} emptyMessage="Featured picks are loading in." />
      <Section title="Trending Books" books={data.trending} emptyMessage="Trending stories will show here soon." />
      <Section title="Popular Books" books={data.popular} emptyMessage="Popular books are on the way." />

      <section className="mb-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Latest Books</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Fast, paginated browsing for the newest additions in the library.
            </p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {latestBooks.length} of {latestBooksPagination?.total || latestBooks.length} books
          </p>
        </div>

        {latestBooks.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
              {latestBooks.map((book, index) => <BookCard key={book._id} book={book} priority={index < 2 && (latestBooksPagination?.page || 1) === 1} />)}
            </div>
            <PaginationNav pagination={latestBooksPagination} basePath="/" limit={BOOKS_PER_PAGE} />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Fresh books are loading in right now.
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-bold">Latest Chapters</h2>
        <div className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {data.latestChapters.filter((chapter) => chapter.bookId).length > 0 ? (
            data.latestChapters.filter((chapter) => chapter.bookId).map((chapter) => (
              <Link key={chapter._id} className="block rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800" href={`/book/${chapter.bookId.slug}/${chapter.slug}${chapter.bookId.language === 'hi' ? '?lang=hi' : ''}`}>
                {chapter.bookId.title} — Chapter {chapter.chapterNumber}: {chapter.title}
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">New chapter updates will appear here as soon as they&apos;re ready.</p>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-bold">Categories</h2>
        <div className="flex flex-wrap gap-3">
          {categories.length > 0 ? categories.map((cat) => (
            <Link key={cat} href={`/category/${cat}`} className="rounded-full bg-slate-200 px-4 py-2 capitalize dark:bg-slate-800">
              {cat}
            </Link>
          )) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Category shortcuts will appear after content loads.</p>
          )}
        </div>
      </section>
    </Layout>
  );
}

function Section({ title, books, emptyMessage }) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      {books.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {books.map((book, index) => <BookCard key={book._id} book={book} priority={index < 2} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

export async function getServerSideProps({ query }) {
  const page = Number.parseInt(query.page, 10) > 0 ? Number.parseInt(query.page, 10) : 1;

  try {
    const [{ data }, booksResponse] = await Promise.all([
      api.get('/books/homepage'),
      api.get('/books', { params: { page, limit: BOOKS_PER_PAGE } })
    ]);
    const categorySet = new Set();

    for (const group of [data.featured, data.trending, data.popular]) {
      for (const book of group || []) {
        if (book?.category) categorySet.add(book.category);
      }
    }

    return {
      props: {
        data,
        categories: Array.from(categorySet),
        latestBooks: booksResponse.data.data || [],
        latestBooksPagination: booksResponse.data.pagination || null,
        isFallback: false
      }
    };
  } catch (_error) {
    return {
      props: {
        data: { featured: [], trending: [], popular: [], latestChapters: [] },
        categories: [],
        latestBooks: [],
        latestBooksPagination: null,
        isFallback: true
      }
    };
  }
}
