import Link from 'next/link';
import { useMemo, useState } from 'react';
import Layout from '../../../components/Layout';
import SeoHead from '../../../components/SeoHead';
import ReaderControls from '../../../components/ReaderControls';
import AdSlot from '../../../components/AdSlot';
import api from '../../../utils/api';
import { buildMeta } from '../../../utils/seo';

export default function ChapterPage({ book, chapter, previousChapter, nextChapter, error }) {
  const [settings, setSettings] = useState({ fontSize: 18, lineHeight: 1.8 });
  const [bookmarkMessage, setBookmarkMessage] = useState('');
  const content = chapter?.content || '';
  const paragraphs = useMemo(() => content.split('\n\n').filter(Boolean), [content]);

  if (error || !book || !chapter) {
    return (
      <Layout>
        <p className="rounded border border-red-200 bg-red-50 p-4 text-red-600">{error || 'Chapter not found'}</p>
      </Layout>
    );
  }

  const onBookmark = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setBookmarkMessage('Login required to save bookmarks.');
      return;
    }

    try {
      await api.post(`/user/bookmark/${chapter._id}`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookmarkMessage('Bookmark updated.');
    } catch (bookmarkError) {
      setBookmarkMessage(bookmarkError.message || 'Could not update bookmark.');
    }
  };

  const meta = buildMeta({
    title: `${book.title} - ${chapter.title} | ReadNovaX`,
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
      {bookmarkMessage && <p className="mb-4 rounded border p-2 text-sm dark:border-slate-700">{bookmarkMessage}</p>}

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
  try {
    const { data } = await api.get(`/chapters/${params.slug}/${params.chapterSlug}`);
    return { props: { ...data, error: null } };
  } catch (error) {
    return { props: { book: null, chapter: null, previousChapter: null, nextChapter: null, error: error.message } };
  }
}
