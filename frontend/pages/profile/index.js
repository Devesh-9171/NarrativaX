import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

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
  const [otp, setOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const router = useRouter();
  const { user, token, refreshUser, clearAuthState, setToken } = useAuth();

  const loadProfile = useCallback(async () => {
    if (!token) {
      setMe(null);
      return;
    }
    try {
      const currentUser = await refreshUser();
      setMe(currentUser || null);
      setAuthorForm((current) => ({
        ...current,
        fullName: currentUser?.authorProfile?.fullName || '',
        penName: currentUser?.authorProfile?.penName || '',
        bio: currentUser?.authorProfile?.bio || '',
        paymentDetails: currentUser?.authorProfile?.paymentDetails || '',
        idVerification: currentUser?.authorProfile?.idVerification || ''
      }));
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    }
  }, [refreshUser, token]);

  useEffect(() => {
    setMe(user || null);
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (user?.role === 'admin') {
      router.replace('/admin');
    }
  }, [router, user?.role]);

  const handleLogout = async () => {
    await clearAuthState();
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
  const showEmailWarning = me?.role === 'user' && !isEmailVerified;

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
            {showEmailWarning ? <p className="rounded-xl border border-amber-400/40 bg-amber-100/60 p-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Email not verified. Please verify your email before applying as author.</p> : null}
            {showEmailWarning ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input className={INPUT_CLASS} placeholder="Enter 6-digit OTP" value={otp} maxLength={6} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} />
                <button
                  type="button"
                  disabled={verifyingOtp || otp.length !== 6}
                  className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={async () => {
                    setError('');
                    setSuccess('');
                    try {
                      setVerifyingOtp(true);
                      const response = await api.post('/auth/verify-email', { email: me.email, otp });
                      if (response.data?.token) await setToken(response.data.token);
                      setSuccess('Email verified successfully.');
                      setOtp('');
                      await loadProfile();
                    } catch (requestError) {
                      setError(requestError.message || 'OTP verification failed.');
                    } finally {
                      setVerifyingOtp(false);
                    }
                  }}
                >
                  {verifyingOtp ? 'Verifying...' : 'Verify'}
                </button>
                <button
                  type="button"
                  disabled={resendingOtp}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-slate-700"
                  onClick={async () => {
                    setError('');
                    setSuccess('');
                    try {
                      setResendingOtp(true);
                      await api.post('/auth/resend-otp', { email: me.email });
                      setSuccess('A new OTP has been sent to your email.');
                    } catch (requestError) {
                      setError(requestError.message || 'Could not resend OTP.');
                    } finally {
                      setResendingOtp(false);
                    }
                  }}
                >
                  {resendingOtp ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>
            ) : null}
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

          {me.role === 'author' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-xl font-semibold">Author Dashboard</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your books, chapters, and short stories.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link href="/author" className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm dark:border-slate-700">Open Author Workspace</Link>
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
              <button disabled={submittingAuthor || authorStatus === 'pending' || !authorForm.agreeToTerms || !isEmailVerified} className="mt-4 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
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
