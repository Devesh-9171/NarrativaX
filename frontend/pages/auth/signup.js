import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const INPUT_CLASS = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500';

export default function SignupPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const { setToken } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');

    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setError('All fields are required.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/signup', {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password
      });
      setPendingEmail(form.email.trim());
      setAwaitingOtp(true);
      setSuccess(response?.data?.message || 'Signup successful. OTP sent to your email.');
    } catch (err) {
      // If signup timed out, account may still be created. Attempt OTP resend to recover gracefully.
      if (err?.isTimeout) {
        try {
          await api.post('/auth/resend-otp', { email: form.email.trim() });
          setPendingEmail(form.email.trim());
          setAwaitingOtp(true);
          setSuccess('Account created. OTP sent to your email. Please verify to continue.');
          setError('');
          return;
        } catch (_resendErr) {
          // Fall through to normal error handling when resend fails.
        }
      }
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      const { data } = await api.post('/auth/verify-email', { email: pendingEmail, otp: otp.trim() });
      await setToken(data.token);
      router.push('/profile');
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (loading || !pendingEmail || resendCooldown > 0) return;
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      const response = await api.post('/auth/resend-otp', { email: pendingEmail });
      setSuccess(response?.data?.message || 'OTP sent. Please check your inbox.');
      const nextCooldown = Number(response?.data?.cooldownSeconds || 45);
      setResendCooldown(nextCooldown);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setResendCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Layout>
      <form onSubmit={awaitingOtp ? verifyOtp : submit} className="mx-auto max-w-md space-y-3 rounded-xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold">{awaitingOtp ? 'Verify Email' : 'Create Account'}</h1>
        {error && <p className="rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-700 dark:text-red-200">{error}</p>}
        {success && <p className="rounded border border-emerald-500/40 bg-emerald-500/10 p-2 text-sm text-emerald-700 dark:text-emerald-200">{success}</p>}
        {awaitingOtp ? (
          <>
            <input className={INPUT_CLASS} value={pendingEmail} disabled />
            <input className={INPUT_CLASS} required minLength={6} maxLength={6} placeholder="Enter 6 digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
            <button disabled={loading || otp.trim().length !== 6} className="w-full rounded bg-brand-600 py-2 text-white disabled:opacity-60">{loading ? 'Verifying...' : 'Verify Email'}</button>
            <button type="button" onClick={resendOtp} disabled={loading || resendCooldown > 0} className="w-full rounded border border-slate-300 py-2 disabled:opacity-60">
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </>
        ) : (
          <>
            <input className={INPUT_CLASS} required minLength={3} placeholder="Username" onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input className={INPUT_CLASS} type="email" required placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={INPUT_CLASS} type="password" required minLength={8} placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button disabled={loading} className="w-full rounded bg-brand-600 py-2 text-white disabled:opacity-60">{loading ? 'Creating account...' : 'Sign Up'}</button>
          </>
        )}
      </form>
    </Layout>
  );
}
