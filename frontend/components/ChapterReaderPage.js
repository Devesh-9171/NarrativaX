import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from './Layout';
import SeoHead from './SeoHead';
import ReaderControls from './ReaderControls';
import AdSlot from './AdSlot';
import api from '../utils/api';
import { buildMeta } from '../utils/seo';

const DEFAULT_SETTINGS = {
  fontSize: 19,
  fontFamily: 'serif',
  theme: 'light'
};

function getChapterHref(bookSlug, chapterSlug) {
  return `/${bookSlug}/${chapterSlug}`;
}

export default function ChapterReaderPage({ book, chapter, chapters = [], previousChapter, nextChapter, isFallback }) {
  const router = useRouter();
  const sentinelRef = useRef(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [bookmarkMessage, setBookmarkMessage] = useState('');
  const [toast, setToast] = useState('');
  const [progress, setProgress] = useState(0);
  const [visibleParagraphs, setVisibleParagraphs] = useState(8);
  const content = chapter?.content || '';
  const paragraphs = useMemo(() => content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean), [content]);
  const displayedParagraphs = paragraphs.slice(0, visibleParagraphs);

  const showProtectionToast = useCallback(() => {
    setToast('Content protected');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const stored = localStorage.getItem('reader-settings');
    const initialTheme = localStorage.getItem('theme') || DEFAULT_SETTINGS.theme;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed, theme: initialTheme });
      } catch {
        setSettings((current) => ({ ...current, theme: initialTheme }));
      }
    } else {
      setSettings((current) => ({ ...current, theme: initialTheme }));
    }
  }, [chapter?._id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('reader-settings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    localStorage.setItem('theme', settings.theme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: settings.theme } }));
  }, [settings]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = maxScroll <= 0 ? 0 : Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
      setProgress(nextProgress);
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [visibleParagraphs]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const protectKeys = (event) => {
      const key = event.key.toLowerCase();
      const blocked = (event.ctrlKey || event.metaKey) && (key === 'c' || key === 'u' || (event.shiftKey && key === 'i'));
      if (!blocked) return;
      event.preventDefault();
      showProtectionToast();
    };

    const blockEvent = (event) => {
      event.preventDefault();
      showProtectionToast();
    };

    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('copy', blockEvent);
    document.addEventListener('selectstart', blockEvent);
    document.addEventListener('keydown', protectKeys);

    return () => {
      document.removeEventListener('contextmenu', blockEvent);
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('selectstart', blockEvent);
      document.removeEventListener('keydown', protectKeys);
    };
  }, [showProtectionToast]);

  useEffect(() => {
    setVisibleParagraphs(8);
  }, [chapter?._id]);

  useEffect(() => {
    if (!sentinelRef.current || visibleParagraphs >= paragraphs.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleParagraphs((current) => Math.min(current + 6, paragraphs.length));
        }
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [paragraphs.length, visibleParagraphs]);

  if (!book || !chapter) {
    return (
      <Layout>
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-950/80">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">This chapter is still loading</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            {isFallback ? 'The reading server is waking up, so we are keeping the page stable until content is ready.' : 'We could not load this chapter yet.'}
          </p>
          <Link href={book ? `/books/${book.slug}` : '/'} className="mt-5 inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-white transition hover:bg-brand-500">
            Browse another page
          </Link>
        </div>
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
    path: getChapterHref(book.slug, chapter.slug)
  });

  const articleFontClass = settings.fontFamily === 'serif' ? 'font-[Georgia,_Cambria,_Times_New_Roman,_serif]' : 'font-[Inter,_system-ui,_sans-serif]';

  const handleJumpToChapter = (chapterSlug) => {
    router.push(getChapterHref(book.slug, chapterSlug));
  };

  return (
    <Layout>
      <SeoHead {...meta} />
      <div className="fixed inset-x-0 top-[65px] z-40 h-1.5 bg-transparent">
        <div className="h-full bg-brand-600 transition-[width] duration-150 dark:bg-sky-400" style={{ width: `${progress}%` }} />
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-[28px] border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-sky-300">Chapter reading</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href={`/books/${book.slug}`} className="text-sm text-slate-500 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-sky-300">
                ← Back to {book.title}
              </Link>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{chapter.title}</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Chapter {chapter.chapterNumber} · {book.author}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {Math.round(progress)}% read
            </div>
          </div>
        </div>

        <ReaderControls
          settings={settings}
          onDecreaseFont={() => setSettings((current) => ({ ...current, fontSize: Math.max(16, current.fontSize - 1) }))}
          onIncreaseFont={() => setSettings((current) => ({ ...current, fontSize: Math.min(24, current.fontSize + 1) }))}
          onToggleTheme={() => setSettings((current) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))}
          onFamilyChange={(fontFamily) => setSettings((current) => ({ ...current, fontFamily }))}
          chapterOptions={chapters}
          currentChapterSlug={chapter.slug}
          onJumpToChapter={handleJumpToChapter}
          onBookmark={onBookmark}
        />

        {bookmarkMessage && <p className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-200">{bookmarkMessage}</p>}

        <article className="mx-auto max-w-[700px] rounded-[32px] border border-slate-200 bg-white px-5 py-8 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:px-8 sm:py-10">
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">ReadNovaX edition</p>
              <h2 className="mt-2 text-2xl font-semibold">{book.title}</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {paragraphs.length} sections
            </span>
          </div>

          <div
            className={`${articleFontClass} select-none space-y-6 text-slate-800 dark:text-slate-100`}
            style={{ fontSize: `${settings.fontSize}px`, lineHeight: 1.95, letterSpacing: '0.01em' }}
          >
            {displayedParagraphs.map((paragraph, index) => (
              <div key={`${chapter._id}-${index}`}>
                <p className="reader-paragraph">{paragraph}</p>
                {(index + 1) % 4 === 0 && index + 1 !== displayedParagraphs.length && (
                  <AdSlot label="Reader sponsor spot" className="my-8 rounded-2xl bg-slate-50/80 dark:bg-slate-900/70" />
                )}
              </div>
            ))}
          </div>

          {visibleParagraphs < paragraphs.length && (
            <div ref={sentinelRef} className="mt-8 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Loading more sections…
            </div>
          )}
        </article>

        <div className="mx-auto mt-6 grid max-w-[700px] gap-3 sm:grid-cols-2">
          {previousChapter ? (
            <Link href={getChapterHref(book.slug, previousChapter.slug)} className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-400 dark:hover:text-sky-300">
              <span className="block text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Previous chapter</span>
              <span className="mt-1 block">{previousChapter.title}</span>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-400 dark:border-slate-700">You are at the beginning.</div>
          )}

          {nextChapter ? (
            <Link href={getChapterHref(book.slug, nextChapter.slug)} className="rounded-2xl bg-brand-600 px-4 py-4 text-sm font-medium text-white transition hover:bg-brand-500 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
              <span className="block text-xs uppercase tracking-[0.2em] text-white/80 dark:text-slate-900/80">Next chapter</span>
              <span className="mt-1 block">{nextChapter.title}</span>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-400 dark:border-slate-700">You reached the latest chapter.</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
