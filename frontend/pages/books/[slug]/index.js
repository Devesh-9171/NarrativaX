import Image from 'next/image';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import SeoHead from '../../../components/SeoHead';
import AdSlot from '../../../components/AdSlot';
import api from '../../../utils/api';
import { buildMeta } from '../../../utils/seo';

export default function BookPage({ book, chapters }) {
  const meta = buildMeta({
    title: `${book.title} by ${book.author} | NarrativaX`,
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
        <div className="relative h-80 w-full overflow-hidden rounded-xl">
          <Image src={book.coverImage} alt={book.title} fill className="object-cover" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{book.title}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">By {book.author}</p>
          <p className="mt-4">{book.description}</p>
          <p className="mt-3 text-sm">⭐ {book.rating} • {book.totalViews.toLocaleString()} reads</p>
          {chapters[0] && (
            <Link href={`/books/${book.slug}/${chapters[0].slug}`} className="mt-5 inline-block rounded bg-brand-600 px-4 py-2 text-white">
              Start Reading
            </Link>
          )}
        </div>
      </div>

      <AdSlot label="Sidebar Ad" className="my-6" />

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Chapters</h2>
        <div className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {chapters.map((c) => (
            <Link key={c._id} href={`/books/${book.slug}/${c.slug}`} className="block border-b py-2 last:border-none dark:border-slate-800">
              Chapter {c.chapterNumber} — {c.title}
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  const { data } = await api.get(`/books/${params.slug}`);
  return { props: data };
}
