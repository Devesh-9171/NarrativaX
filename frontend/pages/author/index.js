import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const INPUT_CLASS = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-400/10';
const CARD_CLASS = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950';

function parseTags(text) {
  return String(text || '').split(',').map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean);
}

export default function AuthorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [books, setBooks] = useState([]);
  const [shortStories, setShortStories] = useState([]);

  const [bookForm, setBookForm] = useState({
    title: '',
    description: '',
    category: 'action',
    language: 'english',
    tags: '',
    coverImageFile: null,
    isTranslation: false,
    translationOfBookId: ''
  });
  const [chapterForm, setChapterForm] = useState({ bookId: '', chapterNumber: '', title: '', content: '', isFinalChapter: false });
  const [storyForm, setStoryForm] = useState({
    title: '',
    description: '',
    content: '',
    language: 'english',
    tags: '',
    coverImageFile: null,
    isTranslation: false,
    translationOfStoryId: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const loadedForTokenRef = useRef('');

  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : null), [token]);

  const loadData = useCallback(async () => {
    if (!headers) return;
    const booksResponse = await api.get('/user/my-content', { headers });
    setBooks(booksResponse.data?.data || []);
    setShortStories(booksResponse.data?.shortStories || []);
    setChapterForm((current) => ({ ...current, bookId: current.bookId || booksResponse.data?.data?.[0]?._id || '' }));
  }, [headers]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      loadedForTokenRef.current = '';
      setLoading(false);
      return;
    }
    if (user?.role !== 'author') {
      loadedForTokenRef.current = '';
      setLoading(false);
      return;
    }
    if (loadedForTokenRef.current === token) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        await loadData();
        if (!isCancelled) loadedForTokenRef.current = token;
      } catch (requestError) {
        if (!isCancelled) setError(requestError.message || 'Could not load author workspace.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [authLoading, loadData, token, user?.role]);


  useEffect(() => {
    if (authLoading) return;
    if (!token && router.pathname !== '/auth/login') {
      router.replace('/auth/login');
      return;
    }
    if (user?.role === 'admin' && router.pathname !== '/admin') {
      router.replace('/admin');
      return;
    }
    if (token && user && user.role !== 'author' && user.role !== 'admin' && router.pathname !== '/profile') {
      router.replace('/profile');
    }
  }, [authLoading, router, token, user]);
  const submitBook = async (event) => {
    event.preventDefault();
    if (!headers) return;

    const tags = parseTags(bookForm.tags);
    if (tags.length > 10) {
      setError('Books support up to 10 tags.');
      return;
    }

    setError('');
    setSuccess('');
    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append('title', bookForm.title.trim());
      payload.append('description', bookForm.description.trim());
      payload.append('category', bookForm.category.trim());
      payload.append('language', bookForm.language);
      payload.append('tags', tags.join(','));
      payload.append('coverImage', bookForm.coverImageFile);
      if (bookForm.isTranslation) {
        if (!bookForm.translationOfBookId) {
          setError('Please select the original story to translate.');
          setSubmitting(false);
          return;
        }
        payload.append('translationOfBookId', bookForm.translationOfBookId);
      }
      await api.post('/books', payload, { headers });
      setSuccess('Book submitted for review.');
      setBookForm({
        title: '',
        description: '',
        category: 'action',
        language: 'english',
        tags: '',
        coverImageFile: null,
        isTranslation: false,
        translationOfBookId: ''
      });
      loadedForTokenRef.current = '';
      await loadData();
    } catch (requestError) {
      setError(requestError.message || 'Could not save book.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitChapter = async (event) => {
    event.preventDefault();
    if (!headers) return;
    setError('');
    setSuccess('');

    try {
      setSubmitting(true);
      await api.post('/chapters', chapterForm, { headers });
      setSuccess('Chapter submitted for review.');
      setChapterForm((current) => ({ ...current, chapterNumber: '', title: '', content: '', isFinalChapter: false }));
      loadedForTokenRef.current = '';
    } catch (requestError) {
      setError(requestError.message || 'Could not save chapter.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitShortStory = async (event) => {
    event.preventDefault();
    if (!headers) return;

    const tags = parseTags(storyForm.tags);
    if (tags.length > 3) {
      setError('Short stories support up to 3 tags.');
      return;
    }

    if (String(storyForm.description || '').trim().split(/\s+/).filter(Boolean).length > 50) {
      setError('Short story description must be 50 words or fewer.');
      return;
    }

    setError('');
    setSuccess('');
    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append('title', storyForm.title.trim());
      payload.append('description', storyForm.description.trim());
      payload.append('content', storyForm.content.trim());
      payload.append('language', storyForm.language);
      payload.append('tags', tags.join(','));
      payload.append('coverImage', storyForm.coverImageFile);
      if (storyForm.isTranslation) {
        if (!storyForm.translationOfStoryId) {
          setError('Please select the original short story to translate.');
          setSubmitting(false);
          return;
        }
        payload.append('translationOfStoryId', storyForm.translationOfStoryId);
      }
      await api.post('/short-stories', payload, { headers });
      setSuccess('Short story uploaded and queued for admin review.');
      setStoryForm({
        title: '',
        description: '',
        content: '',
        language: 'english',
        tags: '',
        coverImageFile: null,
        isTranslation: false,
        translationOfStoryId: ''
      });
      loadedForTokenRef.current = '';
    } catch (requestError) {
      setError(requestError.message || 'Could not upload short story.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <Layout><p>Loading author dashboard...</p></Layout>;
  if (!token) {
    return (
      <Layout>
        <div className={CARD_CLASS}>
          <p className="font-semibold">Please login to access the author dashboard.</p>
          <Link href="/auth/login" className="mt-3 inline-block text-brand-600">Go to login</Link>
        </div>
      </Layout>
    );
  }
  if (!user?.authorTermsAcceptance?.acceptedTerms) {
    return (
      <Layout>
        <div className={CARD_CLASS}>
          <p className="font-semibold text-red-700 dark:text-red-200">You must accept Terms & Conditions to become an author</p>
          <Link href="/profile" className="mt-3 inline-block text-brand-600">Back to profile</Link>
        </div>
      </Layout>
    );
  }
  if (user?.role !== 'author') {
    return <Layout><div className={CARD_CLASS}><p className="font-semibold">Author access required.</p><Link href="/profile" className="mt-3 inline-block text-brand-600">Back to profile</Link></div></Layout>;
  }

  return (
    <Layout>
      <h1 className="mb-6 text-3xl font-bold">Author Dashboard</h1>
      {error ? <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</p> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={submitBook} className={CARD_CLASS}>
          <h2 className="text-xl font-semibold">Create Book</h2>
          <div className="mt-3 space-y-3">
            <input className={INPUT_CLASS} placeholder="Title" required value={bookForm.title} onChange={(e) => setBookForm((c) => ({ ...c, title: e.target.value }))} />
            <textarea className={`${INPUT_CLASS} min-h-[110px]`} placeholder="Description" required value={bookForm.description} onChange={(e) => setBookForm((c) => ({ ...c, description: e.target.value }))} />
            <select className={INPUT_CLASS} required value={bookForm.language} onChange={(e) => setBookForm((c) => ({ ...c, language: e.target.value }))}>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={bookForm.isTranslation}
                onChange={(e) => setBookForm((c) => ({ ...c, isTranslation: e.target.checked, translationOfBookId: e.target.checked ? c.translationOfBookId : '' }))}
              />
              This story is a translation of another story
            </label>
            {bookForm.isTranslation ? (
              <select className={INPUT_CLASS} required value={bookForm.translationOfBookId} onChange={(e) => setBookForm((c) => ({ ...c, translationOfBookId: e.target.value }))}>
                <option value="">Select original story</option>
                {books.map((book) => (
                  <option key={book._id} value={book._id}>
                    {book.title} ({book.language})
                  </option>
                ))}
              </select>
            ) : null}
            <input className={INPUT_CLASS} placeholder="Tags (comma separated, max 10)" value={bookForm.tags} onChange={(e) => setBookForm((c) => ({ ...c, tags: e.target.value }))} />
            <input className={INPUT_CLASS} type="file" accept="image/*" required onChange={(e) => setBookForm((c) => ({ ...c, coverImageFile: e.target.files?.[0] || null }))} />
            <button disabled={submitting} className="w-full rounded-xl bg-brand-600 px-4 py-2 text-white disabled:opacity-60">{submitting ? 'Saving...' : 'Save Book'}</button>
          </div>
        </form>

        <form onSubmit={submitChapter} className={CARD_CLASS}>
          <h2 className="text-xl font-semibold">Add Chapter</h2>
          <div className="mt-3 space-y-3">
            <select className={INPUT_CLASS} required value={chapterForm.bookId} onChange={(e) => setChapterForm((c) => ({ ...c, bookId: e.target.value }))}>
              <option value="">Select your book</option>
              {books.map((book) => <option key={book._id} value={book._id}>{book.title}</option>)}
            </select>
            <input className={INPUT_CLASS} type="number" min="1" required placeholder="Chapter number" value={chapterForm.chapterNumber} onChange={(e) => setChapterForm((c) => ({ ...c, chapterNumber: e.target.value }))} />
            <input className={INPUT_CLASS} required placeholder="Chapter title" value={chapterForm.title} onChange={(e) => setChapterForm((c) => ({ ...c, title: e.target.value }))} />
            <textarea className={`${INPUT_CLASS} min-h-[150px]`} required placeholder="Chapter content" value={chapterForm.content} onChange={(e) => setChapterForm((c) => ({ ...c, content: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={Boolean(chapterForm.isFinalChapter)}
                onChange={(e) => setChapterForm((c) => ({ ...c, isFinalChapter: e.target.checked }))}
              />
              Mark as Final Chapter
            </label>
            <button disabled={submitting} className="w-full rounded-xl bg-brand-600 px-4 py-2 text-white disabled:opacity-60">{submitting ? 'Saving...' : 'Save Chapter'}</button>
          </div>
        </form>

        <form onSubmit={submitShortStory} className={`${CARD_CLASS} lg:col-span-2`}>
          <h2 className="text-xl font-semibold">Upload Short Story</h2>
          <p className="mt-1 text-sm text-slate-500">Single-page format only. Max 3 tags. Description max 50 words.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className={INPUT_CLASS} required placeholder="Title" value={storyForm.title} onChange={(e) => setStoryForm((c) => ({ ...c, title: e.target.value }))} />
            <select className={INPUT_CLASS} required value={storyForm.language} onChange={(e) => setStoryForm((c) => ({ ...c, language: e.target.value }))}>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
            </select>
            <input className={INPUT_CLASS} placeholder="Tags (comma separated, max 3)" value={storyForm.tags} onChange={(e) => setStoryForm((c) => ({ ...c, tags: e.target.value }))} />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={storyForm.isTranslation}
              onChange={(e) => setStoryForm((c) => ({ ...c, isTranslation: e.target.checked, translationOfStoryId: e.target.checked ? c.translationOfStoryId : '' }))}
            />
            This story is a translation of another story
          </label>
          {storyForm.isTranslation ? (
            <select className={`${INPUT_CLASS} mt-3`} required value={storyForm.translationOfStoryId} onChange={(e) => setStoryForm((c) => ({ ...c, translationOfStoryId: e.target.value }))}>
              <option value="">Select original short story</option>
              {shortStories.map((story) => (
                <option key={story._id} value={story._id}>
                  {story.title} ({story.language})
                </option>
              ))}
            </select>
          ) : null}
          <textarea className={`${INPUT_CLASS} mt-3 min-h-[90px]`} required placeholder="Description" value={storyForm.description} onChange={(e) => setStoryForm((c) => ({ ...c, description: e.target.value }))} />
          <textarea className={`${INPUT_CLASS} mt-3 min-h-[200px]`} required placeholder="Story content (single page)" value={storyForm.content} onChange={(e) => setStoryForm((c) => ({ ...c, content: e.target.value }))} />
          <input className={`${INPUT_CLASS} mt-3`} type="file" accept="image/*" required onChange={(e) => setStoryForm((c) => ({ ...c, coverImageFile: e.target.files?.[0] || null }))} />
          <button disabled={submitting} className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-2 text-white disabled:opacity-60">{submitting ? 'Uploading...' : 'Upload Short Story'}</button>
        </form>
      </div>
    </Layout>
  );
}
