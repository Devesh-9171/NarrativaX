import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const REPORT_OPTIONS = ['Copied / Plagiarism', 'Spam / Low Quality', 'Offensive Content', 'Other'];

export default function ContentReportMenu({ contentId, contentType, className = '' }) {
  const { user, token } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [reportType, setReportType] = useState(REPORT_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isGuest = !token;
  const descriptionRequired = isGuest;

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(''), 2400);
    return () => window.clearTimeout(timer);
  }, [success]);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !reportType) return false;
    if (descriptionRequired && !description.trim()) return false;
    return true;
  }, [description, descriptionRequired, email, reportType]);

  const closeForm = () => {
    setFormOpen(false);
    setError('');
    setMenuOpen(false);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError('');

    try {
      await api.post('/reports', {
        contentId,
        contentType,
        reportType,
        email: email.trim(),
        description: description.trim()
      }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);

      setSuccess('Report submitted successfully');
      setDescription('');
      setFormOpen(false);
      setMenuOpen(false);
    } catch (submitError) {
      setError(submitError?.message || 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-xl leading-none text-slate-700 hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        aria-label="Open content actions"
      >
        ⋮
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-11 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => setFormOpen(true)}
          >
            Report
          </button>
        </div>
      )}

      {success ? <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-300">{success}</p> : null}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-950">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Report content</h3>
              <button type="button" onClick={closeForm} className="rounded-full px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
            </div>

            <form className="space-y-3" onSubmit={onSubmit}>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Email *</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Report Type *</span>
                <select
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {REPORT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Description {descriptionRequired ? '*' : '(optional)'}</span>
                <textarea
                  rows={4}
                  value={description}
                  required={descriptionRequired}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder={descriptionRequired ? 'Tell us what happened...' : 'Optional details'}
                />
              </label>

              {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}

              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="w-full rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit report'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
