import Link from 'next/link';
import Layout from '../components/Layout';
import BookCard from '../components/BookCard';
import SeoHead from '../components/SeoHead';
import AdSlot from '../components/AdSlot';
import api from '../utils/api';
import { buildMeta } from '../utils/seo';

export default function Home({ data }) {
  const meta = buildMeta({
    title: 'NarrativaX - Read trending novels online',
    description: 'Discover trending books, latest chapters, and immersive reading on NarrativaX.',
    image: '/images/logo.svg',
    path: '/'
  });

  return (
    <Layout>
      <SeoHead {...meta} />
      <section className="mb-8 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 p-8 text-white">
        <h1 className="mb-2 text-4xl font-bold">Read Your Next Obsession</h1>
        <p className="mb-5 max-w-2xl">Featured novels updated daily with clean reading, bookmarks, and personalized progress.</p>
        <Link href="/category/action" className="rounded bg-white px-4 py-2 font-semibold text-blue-700">Start Reading</Link>
      </section>

      <AdSlot label="Top Banner Ad" className="mb-8" />

      <Section title="Featured Novels" books={data.featured} />
      <Section title="Trending Books" books={data.trending} />
      <Section title="Popular Books" books={data.popular} />

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-bold">Latest Chapters</h2>
        <div className="space-y-2 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {data.latestChapters.map((chapter) => (
            <Link key={chapter._id} className="block rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800" href={`/books/${chapter.bookId.slug}/${chapter.slug}`}>
              {chapter.bookId.title} — Chapter {chapter.chapterNumber}: {chapter.title}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Categories</h2>
        <div className="flex flex-wrap gap-3">
          {['action', 'romance', 'comedy', 'mystery', 'finance'].map((cat) => (
            <Link key={cat} href={`/category/${cat}`} className="rounded-full bg-slate-200 px-4 py-2 capitalize dark:bg-slate-800">
              {cat}
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  );
}

function Section({ title, books }) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {books.map((book) => <BookCard key={book._id} book={book} />)}
      </div>
    </section>
  );
}

export async function getServerSideProps() {
  const { data } = await api.get('/books/homepage');
  return { props: { data } };
}
