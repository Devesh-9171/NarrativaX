import Image from 'next/image';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import SeoHead from '../../../components/SeoHead';
import AdSlot from '../../../components/AdSlot';
import api from '../../../utils/api';
import { buildMeta } from '../../../utils/seo';

export default function BookPage({ book, chapters, isFallback }) {
  if (!book) {
    return (
      <Layout>
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-950/80">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">This book is still loading</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            {isFallback ? 'The backend is waking up, so we are showing a safe empty state for now.' : 'We could not find this book yet.'}
          </p>
          <Link href="/" className="mt-5 inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-white transition hover:bg-brand-500">
            Browse homepage
          </Link>
        </div>
      </Layout>
    );
  }

  const meta = buildMeta({
    title: `${book.title} by ${book.author} | ReadNovaX`,
    description: book.description,
    image: book.coverImage,
    path: `/books/${book.slug}`
  });

  return (
    <Layout>
      <SeoHead
        {...meta}
        structuredData={{ '@context': 'https://schema.org', '@type': 'Book', name: book.title, author: book.author, aggregateRating: { '@type': 'AggregateRating', ratingValue: book.rating } }}
      />
      <div className="grid gap-8 md:grid-cols-[250px_1fr]">
        <div className="relative h-80 w-full overflow-hidden rounded-3xl shadow-sm">
          <Image src={book.coverImage} alt={book.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 250px" priority />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{book.title}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">By {book.author}</p>
          <p className="mt-4 max-w-2xl text-slate-700 dark:text-slate-200">{book.description}</p>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">⭐ {book.rating} • {book.totalViews.toLocaleString()} reads</p>
          {chapters[0] && (
            <Link href={`/${book.slug}/${chapters[0].slug}`} className="mt-5 inline-block rounded-full bg-brand-600 px-5 py-2.5 text-white transition hover:bg-brand-500">
              Start Reading
            </Link>
          )}
        </div>
      </div>

      <AdSlot label="Featured reading partner" className="my-6 rounded-2xl bg-white/70 dark:bg-slate-900/70" />

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Chapters</h2>
        <div className="rounded-3xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {chapters.length > 0 ? chapters.map((chapter) => (
            <Link key={chapter._id} href={`/${book.slug}/${chapter.slug}`} className="block border-b border-slate-200 py-3 last:border-none dark:border-slate-800">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Chapter {chapter.chapterNumber}</span>
              <span className="mt-1 block text-base">{chapter.title}</span>
            </Link>
          )) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Chapter list will appear here once it finishes loading.</p>
          )}
        </div>
      </section>
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const { data } = await api.get(`/books/${params.slug}`);
    return { props: { ...data, isFallback: false } };
  } catch (_error) {
    return { props: { book: null, chapters: [], isFallback: true } };
  }
}
