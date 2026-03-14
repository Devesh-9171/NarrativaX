import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Layout from '../../../components/Layout';
import SeoHead from '../../../components/SeoHead';
import ReaderControls from '../../../components/ReaderControls';
import AdSlot from '../../../components/AdSlot';
import api from '../../../utils/api';
import { buildMeta } from '../../../utils/seo';

export default function ChapterPage({ book, chapter, previousChapter, nextChapter }) {
  const [settings, setSettings] = useState({ dark: false, fontSize: 18, lineHeight: 1.8 });
  const paragraphs = useMemo(() => chapter.content.split('\n\n'), [chapter.content]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.dark);
    return () => document.documentElement.classList.remove('dark');
  }, [settings.dark]);

  const onBookmark = () => {
    localStorage.setItem(`bookmark:${book.slug}`, chapter.slug);
    alert('Bookmarked chapter');
  };

  const meta = buildMeta({
    title: `${book.title} - ${chapter.title} | NarrativaX`,
    description: chapter.content.slice(0, 150),
    image: book.coverImage,
    path: `/books/${book.slug}/${chapter.slug}`
  });

  return (
    <Layout>
      <SeoHead {...meta} />
      <div className="mb-4 h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
        <div className="h-full w-1/2 bg-brand-600" />
      </div>
      <ReaderControls settings={settings} setSettings={setSettings} onBookmark={onBookmark} />

      <article className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900" style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}>
        <h1 className="mb-5 text-3xl font-bold">{chapter.title}</h1>
        <AdSlot label="Top Chapter Banner" className="mb-6" />
        {paragraphs.map((p, idx) => (
          <div key={idx}>
            <p className="reader-paragraph">{p}</p>
            {(idx + 1) % 3 === 0 && <AdSlot label="Mid Chapter Ad" className="my-4" />}
          </div>
        ))}
        <AdSlot label="End Chapter Ad" className="mt-4" />
      </article>

      <div className="mt-6 flex justify-between">
        {previousChapter ? <Link className="rounded border px-4 py-2" href={`/books/${book.slug}/${previousChapter.slug}`}>← Previous</Link> : <span />}
        {nextChapter ? <Link className="rounded bg-brand-600 px-4 py-2 text-white" href={`/books/${book.slug}/${nextChapter.slug}`}>Next →</Link> : <span />}
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  const { data } = await api.get(`/chapters/${params.slug}/${params.chapterSlug}`);
  return { props: data };
}
