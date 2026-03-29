import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from './Layout';
import SeoHead from './SeoHead';
import ReaderControls from './ReaderControls';
import AdSlot from './AdSlot';
import api from '../utils/api';
import { buildCanonicalUrl, buildMeta } from '../utils/seo';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ContentReportMenu from './ContentReportMenu';

const DEFAULT_SETTINGS = {
  fontSize: 19,
  fontFamily: 'serif'
};

function buildBookHref(book) {
  return `/book/${book.slug}${book.language === 'hi' ? '?lang=hi' : ''}`;
}

function getChapterHref(book, chapterSlug, language = book.language) {
  return `/book/${book.slug}/${chapterSlug}${language === 'hi' ? '?lang=hi' : ''}`;
}

export default function ChapterReaderPage({ book, chapter, chapters = [], previousChapter, nextChapter, translations = [], chapterTranslations = [], similarBooks = [], isRecommendationFallback = false, isFallback }) {
  const router = useRouter();
  const sentinelRef = useRef(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [bookmarkMessage, setBookmarkMessage] = useState('');
  const [toast, setToast] = useState('');
  const [progress, setProgress] = useState(0);
  const [visibleParagraphs, setVisibleParagraphs] = useState(8);
  const [completionTracked, setCompletionTracked] = useState(false);
  const { theme, setTheme } = useTheme();
  const { token } = useAuth();
  const content = chapter?.content || '';
  const paragraphs = useMemo(() => content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean), [content]);
  const displayedParagraphs = paragraphs.slice(0, visibleParagraphs);

  const hasTrackedOpenRef = useRef(false);
  const hasTrackedScrollRef = useRef(false);

  const saveContinueReadingProgress = useCallback(async () => {
    if (!token || !book?._id || !chapter?._id || !Number.isFinite(Number(chapter?.chapterNumber))) return;

    try {
      await api.post('/user/reading-progress', {
        bookId: book._id,
        chapterId: chapter._id,
        chapterNumber: chapter.chapterNumber
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (_error) {
      // no-op to avoid interrupting reading flow
    }
  }, [book?._id, chapter?._id, chapter?.chapterNumber, token]);

  const showProtectionToast = useCallback(() => {
    setToast('Content protected');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const stored = localStorage.getItem('reader-settings');

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({
          fontSize: Number(parsed.fontSize) || DEFAULT_SETTINGS.fontSize,
          fontFamily: parsed.fontFamily === 'sans' ? 'sans' : DEFAULT_SETTINGS.fontFamily
        });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }
  }, [chapter?._id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('reader-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);


  const saveGuestHistory = useCallback((status) => {
    if (typeof window === 'undefined' || !chapter?._id) return;
    const key = 'guest-reading-history';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const next = current.filter((item) => item.chapterId !== chapter._id);
    next.unshift({
      chapterId: chapter._id,
      chapterTitle: chapter.title,
      bookId: book?._id,
      bookTitle: book?.title,
      status,
      progress: status === 'read' ? 100 : Math.round(progress),
      updatedAt: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(next.slice(0, 80)));
  }, [book?._id, book?.title, chapter?._id, chapter?.title, progress]);

  const trackCompletedView = useCallback(async () => {
    if (!chapter?._id || completionTracked) return;
    const guestKey = 'guest-completed-views';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const seen = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(guestKey) || '[]') : [];
    if (!token && seen.includes(chapter._id)) return;

    try {
      await api.post('/chapters/complete-view', {
        chapterId: chapter._id,
        progress: 100,
        status: 'read',
        tags: book?.tags || [],
        contentType: book?.contentType,
        readingTimeMinutes: book?.readingTimeMinutes
      }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);

      if (!token && typeof window !== 'undefined') {
        localStorage.setItem(guestKey, JSON.stringify([...seen, chapter._id]));
      }

      if (token) {
        await api.post('/user/progress', { bookId: book?._id, chapterId: chapter._id, progress: 100, status: 'read' }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        saveGuestHistory('read');
      }

      setCompletionTracked(true);
    } catch (_error) {
      // no-op to avoid interrupting reading flow
    }
  }, [book?._id, book?.contentType, book?.readingTimeMinutes, book?.tags, chapter?._id, completionTracked, saveGuestHistory]);

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
    setCompletionTracked(false);
    hasTrackedOpenRef.current = false;
    hasTrackedScrollRef.current = false;
  }, [chapter?._id]);


  useEffect(() => {
    if (progress >= 99 && visibleParagraphs >= paragraphs.length && !completionTracked) {
      trackCompletedView();
    }
  }, [completionTracked, paragraphs.length, progress, trackCompletedView, visibleParagraphs]);


  useEffect(() => {
    if (!token || !chapter?._id || hasTrackedOpenRef.current) return;
    hasTrackedOpenRef.current = true;
    saveContinueReadingProgress();
  }, [chapter?._id, saveContinueReadingProgress, token]);

  useEffect(() => {
    if (!token || progress < 50 || hasTrackedScrollRef.current) return;
    hasTrackedScrollRef.current = true;
    saveContinueReadingProgress();
  }, [progress, saveContinueReadingProgress, token]);


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
          <Link href={book ? buildBookHref(book) : '/'} className="mt-5 inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-white transition hover:bg-brand-500">
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
    path: `/book/${book.slug}/${chapter.slug}${book.language === 'hi' ? '?lang=hi' : ''}`
  });

  const alternates = chapterTranslations.length > 0
    ? [
        ...chapterTranslations.map((translation) => ({
          hrefLang: translation.language,
          href: buildCanonicalUrl(`/book/${book.slug}/${translation.chapterSlug}${translation.language === 'hi' ? '?lang=hi' : ''}`)
        })),
        {
          hrefLang: 'x-default',
          href: buildCanonicalUrl(`/book/${book.slug}/${chapterTranslations.find((translation) => translation.language === 'en')?.chapterSlug || chapter.slug}`)
        }
      ]
    : [{ hrefLang: book.language, href: buildCanonicalUrl(`/book/${book.slug}/${chapter.slug}${book.language === 'hi' ? '?lang=hi' : ''}`) }];
  const articleFontClass = settings.fontFamily === 'serif' ? 'font-[Georgia,_Cambria,_Times_New_Roman,_serif]' : 'font-[Inter,_system-ui,_sans-serif]';

  const handleJumpToChapter = (chapterSlug) => {
    router.push(getChapterHref(book, chapterSlug));
  };

  const showLanguageSwitch = translations.length > 1;
  const isFinalChapter = Boolean(chapter?.isFinalChapter);
  const shouldShowNextChapter = !isFinalChapter && Boolean(nextChapter);

  return (
    <Layout>
      <SeoHead {...meta} alternates={alternates} />
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
              <Link href={buildBookHref(book)} className="text-sm text-slate-500 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-sky-300">
                ← Back to {book.title}
              </Link>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{chapter.title}</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Chapter {chapter.chapterNumber} · {book.author}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              {showLanguageSwitch ? (
                <div className="inline-flex rounded-full border border-slate-300 bg-white p-1 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
                  {translations.map((translation) => {
                    const chapterTranslation = chapterTranslations.find((item) => item.language === translation.language);
                    if (!chapterTranslation) return null;
                    const href = `/book/${book.slug}/${chapterTranslation.chapterSlug}${translation.language === 'hi' ? '?lang=hi' : ''}`;
                    const active = translation.language === book.language;
                    return (
                      <Link key={translation.language} href={href} className={`rounded-full px-3 py-1.5 uppercase ${active ? 'bg-brand-600 text-white dark:bg-sky-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`}>
                        {translation.language}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {Math.round(progress)}% read
                </div>
                <ContentReportMenu contentId={chapter._id} contentType="chapter" />
              </div>
            </div>
          </div>
        </div>

        <ReaderControls
          settings={settings}
          theme={theme}
          onDecreaseFont={() => setSettings((current) => ({ ...current, fontSize: Math.max(16, current.fontSize - 1) }))}
          onIncreaseFont={() => setSettings((current) => ({ ...current, fontSize: Math.min(24, current.fontSize + 1) }))}
          onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
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
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {book.language}
            </span>
          </div>

          <div
            className={`${articleFontClass} select-none space-y-6 text-slate-800 dark:text-slate-100`}
            style={{ fontSize: `${settings.fontSize}px`, lineHeight: 1.95, letterSpacing: '0.01em' }}
          >
            {displayedParagraphs.map((paragraph, index) => (
              <div key={`${chapter._id}-${index}`}>
                <p className="reader-paragraph">{paragraph}</p>
              </div>
            ))}
          </div>

          {visibleParagraphs < paragraphs.length && (
            <div ref={sentinelRef} className="mt-8 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Loading more sections…
            </div>
          )}
        </article>

        <div className="mx-auto mt-6 max-w-[700px]">
          <AdSlot label="Reader sponsor spot" className="mb-4" />
          <div className="grid gap-3 sm:grid-cols-2">
            {previousChapter ? (
              <Link href={getChapterHref(book, previousChapter.slug)} className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-400 dark:hover:text-sky-300">
                <span className="block text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Previous chapter</span>
                <span className="mt-1 block">{previousChapter.title}</span>
              </Link>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-400 dark:border-slate-700">You are at the beginning.</div>
            )}

            {shouldShowNextChapter ? (
              <Link href={getChapterHref(book, nextChapter.slug)} className="rounded-2xl bg-brand-600 px-4 py-4 text-sm font-medium text-white transition hover:bg-brand-500 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
                <span className="block text-xs uppercase tracking-[0.2em] text-white/80 dark:text-slate-900/80">Next chapter</span>
                <span className="mt-1 block">{nextChapter.title}</span>
              </Link>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-400 dark:border-slate-700">{isFinalChapter || book.isCompleted ? 'This story is finished.' : 'You reached the latest chapter.'}</div>
            )}
          </div>

          {isFinalChapter && (similarBooks || []).length > 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Recommended books</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">{isRecommendationFallback ? 'Including trending picks' : 'Based on this book genre/tags'}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {similarBooks.map((item) => (
                  <Link key={item._id} href={`/book/${item.slug}${item.language === 'hi' ? '?lang=hi' : ''}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-400">
                    <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800">
                      {item.coverImage ? <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" loading="lazy" /> : null}
                    </div>
                    <div className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200">{item.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
