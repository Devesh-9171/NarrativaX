import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import api from '../../utils/api';

const INPUT_CLASS = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-400/10';

const initialAuthorForm = {
  fullName: '',
  penName: '',
  bio: '',
  paymentDetails: '',
  idVerification: '',
  agreeToTerms: false
};

export default function ProfilePage() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authorForm, setAuthorForm] = useState(initialAuthorForm);
  const [submittingAuthor, setSubmittingAuthor] = useState(false);
  const [enablingTranslation, setEnablingTranslation] = useState(false);
  const router = useRouter();

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const loadProfile = async () => {
    if (!token) return;
    try {
      const res = await api.get('/user/me', { headers: { Authorization: `Bearer ${token}` } });
      setMe(res.data);
      setAuthorForm((current) => ({
        ...current,
        fullName: res.data?.authorProfile?.fullName || '',
        penName: res.data?.authorProfile?.penName || '',
        bio: res.data?.authorProfile?.bio || '',
        paymentDetails: res.data?.authorProfile?.paymentDetails || '',
        idVerification: res.data?.authorProfile?.idVerification || ''
      }));
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const submitAuthorRequest = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) return;

    try {
      setSubmittingAuthor(true);
      await api.post('/user/author/request', authorForm, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Author request submitted. Waiting for admin approval.');
      await loadProfile();
    } catch (requestError) {
      setError(requestError.message || 'Could not submit author request.');
    } finally {
      setSubmittingAuthor(false);
    }
  };

  const enableTranslationPermission = async () => {
    setError('');
    setSuccess('');
    if (!token) return;

    try {
      setEnablingTranslation(true);
      await api.post('/user/author/translation-permission', {}, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Translation permission enabled permanently.');
      await loadProfile();
    } catch (requestError) {
      setError(requestError.message || 'Could not enable translation permission.');
    } finally {
      setEnablingTranslation(false);
    }
  };

  const authorStatus = me?.authorStatus || 'none';
  const translationPermissionGranted = Boolean(me?.authorProfile?.translationPermissionGrantedAt);
  const isEmailVerified = Boolean(me?.isEmailVerified);

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reader Profile</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Manage account, reading history, and author settings.</p>
        </div>
        <button type="button" onClick={handleLogout} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium transition hover:border-red-400 hover:text-red-500 dark:border-slate-700 dark:hover:border-red-400 dark:hover:text-red-300">
          Logout
        </button>
      </div>

      {error && <p className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>}
      {success && <p className="mb-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">{success}</p>}
      {!me ? (
        <p>Please login to view your profile.</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p><strong>{me.username}</strong> ({me.email})</p>
            <p className="text-sm">Role: <strong className="uppercase">{me.role}</strong> · Author request: <strong className="uppercase">{authorStatus}</strong></p>
            {!isEmailVerified ? <p className="rounded-xl border border-amber-400/40 bg-amber-100/60 p-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Email not verified. Please verify your email before applying as author.</p> : null}
            <section>
              <h2 className="font-semibold">Favorite Books</h2>
              <ul className="list-disc pl-5">{(me.favoriteBooks || []).map((book) => <li key={book._id}>{book.title}</li>)}</ul>
            </section>
            <section>
              <h2 className="font-semibold">Bookmarks</h2>
              <ul className="list-disc pl-5">{(me.bookmarks || []).map((chapter) => <li key={chapter._id}>{chapter.title}</li>)}</ul>
            </section>
            <section>
              <h2 className="font-semibold">Reading History</h2>
              <ul className="list-disc pl-5">{(me.readingHistory || []).slice(0, 8).map((entry) => <li key={entry._id}>{entry.chapterId?.title || 'Chapter'} — {entry.status} ({entry.progress}%)</li>)}</ul>
            </section>
          </div>

          {me.role === 'author' && authorStatus === 'approved' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-xl font-semibold">Author Dashboard</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Link href="/admin" className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm dark:border-slate-700">Create New Book</Link>
                <Link href="/admin" className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm dark:border-slate-700">Add Chapter</Link>
                <Link href="/admin" className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm dark:border-slate-700">Upload Short Story</Link>
              </div>
            </div>
          )}

          {me.role === 'user' && (
            <form onSubmit={submitAuthorRequest} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-xl font-semibold">Become Author</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Submit once. Admin will approve or reject your request.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input className={INPUT_CLASS} placeholder="Full name" value={authorForm.fullName} onChange={(e) => setAuthorForm((c) => ({ ...c, fullName: e.target.value }))} required />
                <input className={INPUT_CLASS} placeholder="Pen name" value={authorForm.penName} onChange={(e) => setAuthorForm((c) => ({ ...c, penName: e.target.value }))} required />
              </div>
              <textarea className={`${INPUT_CLASS} mt-3 min-h-[100px]`} placeholder="Bio" value={authorForm.bio} onChange={(e) => setAuthorForm((c) => ({ ...c, bio: e.target.value }))} required />
              <input className={`${INPUT_CLASS} mt-3`} placeholder="Payment details (optional)" value={authorForm.paymentDetails} onChange={(e) => setAuthorForm((c) => ({ ...c, paymentDetails: e.target.value }))} />
              <textarea className={`${INPUT_CLASS} mt-3 min-h-[90px]`} placeholder="Optional ID verification details" value={authorForm.idVerification} onChange={(e) => setAuthorForm((c) => ({ ...c, idVerification: e.target.value }))} />
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={authorForm.agreeToTerms} onChange={(e) => setAuthorForm((c) => ({ ...c, agreeToTerms: e.target.checked }))} />
                I agree to Terms & Conditions
              </label>
              <button disabled={submittingAuthor || authorStatus === 'pending' || !authorForm.agreeToTerms || !isEmailVerified} className="mt-4 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {submittingAuthor ? 'Submitting...' : authorStatus === 'pending' ? 'Request Pending' : 'Submit Author Request'}
              </button>
            </form>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-xl font-semibold">Translation Permission</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">One-time setting. Once enabled, it cannot be disabled.</p>
            <button
              type="button"
              onClick={enableTranslationPermission}
              disabled={translationPermissionGranted || enablingTranslation}
              className="mt-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-slate-700"
            >
              {translationPermissionGranted ? 'Translation Permission Enabled' : enablingTranslation ? 'Saving...' : 'Allow platform to translate my content'}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
