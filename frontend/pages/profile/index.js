import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const INPUT_CLASS = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-400/10';
const AUTHOR_DECLARATION_TEXT = `By applying as an author on ReadNovaX, you agree that all content submitted by you is original and does not violate any copyright or intellectual property rights.

You confirm that you have full ownership or proper rights to publish the content on this platform.

ReadNovaX does not take responsibility for any copyright violations or legal issues arising from content submitted by authors.

If any content is found to be plagiarized, copied, or in violation of any laws or regulations, ReadNovaX reserves the right to remove such content and suspend or permanently block the author account without prior notice.

In case of serious violations, ReadNovaX also reserves the right to take appropriate legal action if required.

By continuing, you accept full responsibility for your content.`;

const initialAuthorForm = {
  fullName: '',
  penName: '',
  bio: '',
  agreeToTerms: false
};

const initialPaymentForm = {
  upiId: '',
  bankDetails: '',
  internationalPayment: ''
};

export default function ProfilePage() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authorForm, setAuthorForm] = useState(initialAuthorForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [editingPayment, setEditingPayment] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [submittingAuthor, setSubmittingAuthor] = useState(false);
  const [enablingTranslation, setEnablingTranslation] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [showAuthorForm, setShowAuthorForm] = useState(false);
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
        bio: currentUser?.authorProfile?.bio || ''
      }));
      setPaymentForm({
        upiId: currentUser?.authorProfile?.upiId || '',
        bankDetails: currentUser?.authorProfile?.bankDetails || '',
        internationalPayment: currentUser?.authorProfile?.internationalPayment || ''
      });
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
    const timer = setInterval(() => {
      setOtpCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      if (!isEmailVerified) {
        throw new Error('Please verify your email before applying as author.');
      }

      const payload = new FormData();
      payload.append('fullName', authorForm.fullName.trim());
      payload.append('penName', authorForm.penName.trim());
      payload.append('bio', authorForm.bio.trim());
      payload.append('agreeToTerms', String(Boolean(authorForm.agreeToTerms)));

      await api.post('/user/author/request', payload, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Author request submitted. Waiting for admin approval.');
      setShowAuthorForm(false);
      setAuthorForm((current) => ({ ...current, agreeToTerms: false }));
      await loadProfile();
    } catch (requestError) {
      setError(requestError.message || 'Could not submit author request.');
    } finally {
      setSubmittingAuthor(false);
    }
  };

  const savePaymentDetails = async () => {
    if (!token) return;
    setError('');
    setSuccess('');
    try {
      setSavingPayment(true);
      await api.put('/user/author/payment-details', paymentForm, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Payment details updated.');
      setEditingPayment(false);
      await loadProfile();
    } catch (requestError) {
      setError(requestError.message || 'Could not update payment details.');
    } finally {
      setSavingPayment(false);
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
  const hasAcceptedAuthorTerms = Boolean(me?.authorTermsAcceptance?.acceptedTerms);

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
                  disabled={resendingOtp || otpCooldown > 0}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-slate-700"
                  onClick={async () => {
                    setError('');
                    setSuccess('');
                    try {
                      setResendingOtp(true);
                      const response = await api.post('/auth/resend-otp', { email: me.email });
                      setSuccess(response?.data?.message || 'OTP sent to your email.');
                      setOtpCooldown(Number(response?.data?.cooldownSeconds || 45));
                    } catch (requestError) {
                      setError(requestError.message || 'Could not resend OTP.');
                    } finally {
                      setResendingOtp(false);
                    }
                  }}
                >
                  {resendingOtp ? 'Sending...' : otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
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

          {me.role === 'author' && hasAcceptedAuthorTerms && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-xl font-semibold">Author Dashboard</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your books, chapters, and short stories.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link href="/author" className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm dark:border-slate-700">Open Author Workspace</Link>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">Payment Details</h3>
                  {editingPayment ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPayment(false);
                          setPaymentForm({
                            upiId: me?.authorProfile?.upiId || '',
                            bankDetails: me?.authorProfile?.bankDetails || '',
                            internationalPayment: me?.authorProfile?.internationalPayment || ''
                          });
                        }}
                        className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold dark:border-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={savePaymentDetails}
                        disabled={savingPayment}
                        className="rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {savingPayment ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingPayment(true)}
                      className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold dark:border-slate-700"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <div className="mt-4 grid gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">UPI ID</label>
                    <input
                      className={INPUT_CLASS}
                      value={paymentForm.upiId}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, upiId: event.target.value }))}
                      placeholder="yourname@upi"
                      disabled={!editingPayment}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Bank Details (optional)</label>
                    <textarea
                      className={`${INPUT_CLASS} min-h-[90px]`}
                      value={paymentForm.bankDetails}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, bankDetails: event.target.value }))}
                      placeholder="Account holder name, bank, account number, IFSC, etc."
                      disabled={!editingPayment}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">International Payment</label>
                    <input
                      className={INPUT_CLASS}
                      value={paymentForm.internationalPayment}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, internationalPayment: event.target.value }))}
                      placeholder="PayPal email or other payment handle"
                      disabled={!editingPayment}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {me.role === 'author' && !hasAcceptedAuthorTerms && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-500/40 dark:bg-red-500/10">
              <h2 className="text-xl font-semibold text-red-700 dark:text-red-200">Author Access Blocked</h2>
              <p className="mt-2 text-sm text-red-700 dark:text-red-200">You must accept Terms & Conditions to become an author</p>
            </div>
          )}

          {me.role === 'user' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-xl font-semibold">Become Author</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Submit once. Admin will approve or reject your request.</p>
              <button
                type="button"
                disabled={authorStatus === 'pending' || !isEmailVerified}
                onClick={() => setShowAuthorForm((prev) => !prev)}
                className="mt-4 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authorStatus === 'pending' ? 'Request Pending' : showAuthorForm ? 'Hide Author Form' : 'Apply for Author'}
              </button>
              {!isEmailVerified ? <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">Verify your email to apply for author access.</p> : null}

              {showAuthorForm ? (
                <form onSubmit={submitAuthorRequest} className="mt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className={INPUT_CLASS} placeholder="Full name" value={authorForm.fullName} onChange={(e) => setAuthorForm((c) => ({ ...c, fullName: e.target.value }))} required />
                    <input className={INPUT_CLASS} placeholder="Pen name" value={authorForm.penName} onChange={(e) => setAuthorForm((c) => ({ ...c, penName: e.target.value }))} required />
                  </div>
                  <textarea className={`${INPUT_CLASS} mt-3 min-h-[100px]`} placeholder="Bio (optional)" value={authorForm.bio} onChange={(e) => setAuthorForm((c) => ({ ...c, bio: e.target.value }))} />
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                    <p className="mb-2 text-sm font-semibold">Author Terms & Conditions</p>
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      {AUTHOR_DECLARATION_TEXT}
                    </div>
                    <Link href="/terms" className="mt-2 inline-block text-sm font-medium text-brand-600 underline">
                      Read full Terms
                    </Link>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={authorForm.agreeToTerms} onChange={(e) => setAuthorForm((c) => ({ ...c, agreeToTerms: e.target.checked }))} />
                    I accept Terms & Conditions
                  </label>
                  <button disabled={submittingAuthor || !authorForm.agreeToTerms || !isEmailVerified} className="mt-4 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                    {submittingAuthor ? 'Submitting...' : 'Apply for Author'}
                  </button>
                </form>
              ) : null}
            </div>
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
