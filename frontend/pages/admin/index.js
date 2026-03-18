import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../utils/api';

const INPUT_CLASS = 'w-full rounded-lg px-3 py-2 bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[120px]`;
const CARD_CLASS = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';
const ALERT_ERROR_CLASS = 'mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200';
const ALERT_SUCCESS_CLASS = 'mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200';
const CATEGORY_OPTIONS = ['action', 'romance', 'comedy', 'mystery', 'finance'];

const initialBookForm = {
  title: '',
  description: '',
  category: CATEGORY_OPTIONS[0],
  coverImage: ''
};

const initialChapterForm = {
  bookId: '',
  chapterNumber: '',
  title: '',
  content: ''
};

function getAuthHeaders() {
  if (typeof window === 'undefined') return {};

  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [books, setBooks] = useState([]);
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [chapterForm, setChapterForm] = useState(initialChapterForm);
  const [statsError, setStatsError] = useState('');
  const [bookError, setBookError] = useState('');
  const [chapterError, setChapterError] = useState('');
  const [booksError, setBooksError] = useState('');
  const [bookSuccess, setBookSuccess] = useState('');
  const [chapterSuccess, setChapterSuccess] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [submittingBook, setSubmittingBook] = useState(false);
  const [submittingChapter, setSubmittingChapter] = useState(false);

  const authHeaders = useMemo(() => getAuthHeaders(), []);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError('');

    try {
      const { data } = await api.get('/admin/stats', { headers: authHeaders });
      setStats(data);
    } catch (error) {
      setStats(null);
      setStatsError(error.message || 'Failed to load admin stats.');
    } finally {
      setLoadingStats(false);
    }
  }, [authHeaders]);

  const loadBooks = useCallback(async () => {
    setLoadingBooks(true);
    setBooksError('');

    try {
      const { data } = await api.get('/books', { params: { limit: 100 } });
      const nextBooks = data.data || [];
      setBooks(nextBooks);
      setChapterForm((current) => ({
        ...current,
        bookId: current.bookId || nextBooks[0]?._id || ''
      }));
    } catch (error) {
      setBooks([]);
      setBooksError(error.message || 'Failed to load books.');
    } finally {
      setLoadingBooks(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadBooks();
  }, [loadBooks, loadStats]);

  const handleBookChange = (field, value) => {
    setBookForm((current) => ({ ...current, [field]: value }));
  };

  const handleChapterChange = (field, value) => {
    setChapterForm((current) => ({ ...current, [field]: value }));
  };

  const submitBook = async (event) => {
    event.preventDefault();
    setBookError('');
    setBookSuccess('');

    try {
      setSubmittingBook(true);
      await api.post(
        '/books',
        {
          title: bookForm.title.trim(),
          description: bookForm.description.trim(),
          category: bookForm.category.trim(),
          coverImage: bookForm.coverImage.trim()
        },
        { headers: authHeaders }
      );

      setBookSuccess('Book added successfully.');
      setBookForm(initialBookForm);
      await Promise.all([loadStats(), loadBooks()]);
    } catch (error) {
      setBookError(error.message || 'Failed to add book.');
    } finally {
      setSubmittingBook(false);
    }
  };

  const submitChapter = async (event) => {
    event.preventDefault();
    setChapterError('');
    setChapterSuccess('');

    try {
      setSubmittingChapter(true);
      await api.post(
        '/chapters',
        {
          bookId: chapterForm.bookId,
          chapterNumber: Number(chapterForm.chapterNumber),
          title: chapterForm.title.trim(),
          content: chapterForm.content.trim()
        },
        { headers: authHeaders }
      );

      setChapterSuccess('Chapter added successfully.');
      setChapterForm((current) => ({
        ...initialChapterForm,
        bookId: current.bookId || books[0]?._id || ''
      }));
      await loadStats();
    } catch (error) {
      setChapterError(error.message || 'Failed to add chapter.');
    } finally {
      setSubmittingChapter(false);
    }
  };

  return (
    <Layout>
      <section className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Manage books and chapters with a clean, mobile-friendly workflow.
          </p>
        </div>
      </section>

      {statsError && <p className={ALERT_ERROR_CLASS}>{statsError}</p>}
      {booksError && <p className={ALERT_ERROR_CLASS}>{booksError}</p>}

      {loadingStats ? (
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-300">Loading admin analytics...</p>
      ) : stats ? (
        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Books" value={stats.totalBooks} />
          <StatCard label="Chapters" value={stats.totalChapters} />
          <StatCard label="Total Views" value={stats.totalViews} />
        </section>
      ) : (
        <div className={`${CARD_CLASS} mb-8`}>
          <p className="text-sm text-slate-600 dark:text-slate-300">Login as an admin to view analytics and manage content.</p>
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={CARD_CLASS}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Add Book</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Create a new book using a cover image URL only.</p>
          </div>

          {bookError && <p className={ALERT_ERROR_CLASS}>{bookError}</p>}
          {bookSuccess && <p className={ALERT_SUCCESS_CLASS}>{bookSuccess}</p>}

          <form onSubmit={submitBook} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Title</label>
              <input
                className={INPUT_CLASS}
                type="text"
                value={bookForm.title}
                onChange={(event) => handleBookChange('title', event.target.value)}
                placeholder="Enter book title"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Description</label>
              <textarea
                className={TEXTAREA_CLASS}
                value={bookForm.description}
                onChange={(event) => handleBookChange('description', event.target.value)}
                placeholder="Write a short description"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Category</label>
              <select
                className={INPUT_CLASS}
                value={bookForm.category}
                onChange={(event) => handleBookChange('category', event.target.value)}
                required
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Cover Image URL</label>
              <input
                className={INPUT_CLASS}
                type="url"
                value={bookForm.coverImage}
                onChange={(event) => handleBookChange('coverImage', event.target.value)}
                placeholder="https://example.com/cover.jpg"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submittingBook}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingBook ? 'Adding book...' : 'Add Book'}
            </button>
          </form>
        </div>

        <div className={CARD_CLASS}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Add Chapter</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Attach a new chapter to an existing book.</p>
          </div>

          {chapterError && <p className={ALERT_ERROR_CLASS}>{chapterError}</p>}
          {chapterSuccess && <p className={ALERT_SUCCESS_CLASS}>{chapterSuccess}</p>}

          <form onSubmit={submitChapter} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Book</label>
              <select
                className={INPUT_CLASS}
                value={chapterForm.bookId}
                onChange={(event) => handleChapterChange('bookId', event.target.value)}
                required
                disabled={loadingBooks || books.length === 0}
              >
                <option value="">Select a book</option>
                {books.map((book) => (
                  <option key={book._id} value={book._id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Chapter Number</label>
              <input
                className={INPUT_CLASS}
                type="number"
                min="1"
                value={chapterForm.chapterNumber}
                onChange={(event) => handleChapterChange('chapterNumber', event.target.value)}
                placeholder="1"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Title</label>
              <input
                className={INPUT_CLASS}
                type="text"
                value={chapterForm.title}
                onChange={(event) => handleChapterChange('title', event.target.value)}
                placeholder="Chapter title"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Content</label>
              <textarea
                className={TEXTAREA_CLASS}
                value={chapterForm.content}
                onChange={(event) => handleChapterChange('content', event.target.value)}
                placeholder="Write chapter content here"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submittingChapter || books.length === 0}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingChapter ? 'Adding chapter...' : 'Add Chapter'}
            </button>
          </form>
        </div>
      </section>

      <section className={`${CARD_CLASS} mt-8`}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Books List</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">All books currently available in the catalog.</p>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-300">{books.length} total</span>
        </div>

        {loadingBooks ? (
          <p className="text-sm text-slate-500 dark:text-slate-300">Loading books...</p>
        ) : books.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
            No books available yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {books.map((book) => (
              <article key={book._id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <div className="aspect-[3/4] w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={book.coverImage}
                    alt={`${book.title} cover`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-2 p-4">
                  <h3 className="line-clamp-2 text-base font-semibold">{book.title}</h3>
                  <p className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {book.category}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className={CARD_CLASS}>
      <p className="text-sm text-slate-500 dark:text-slate-300">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
