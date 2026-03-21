import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../utils/api';

const INPUT_CLASS = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500';

export default function SignupPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setError('All fields are required.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/signup', {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password
      });
      router.push('/auth/login');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <form onSubmit={submit} className="mx-auto max-w-md space-y-3 rounded-xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold">Create Account</h1>
        {error && <p className="rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-700 dark:text-red-200">{error}</p>}
        <input className={INPUT_CLASS} required minLength={3} placeholder="Username" onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className={INPUT_CLASS} type="email" required placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={INPUT_CLASS} type="password" required minLength={8} placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button disabled={loading} className="w-full rounded bg-brand-600 py-2 text-white disabled:opacity-60">{loading ? 'Creating account...' : 'Sign Up'}</button>
      </form>
    </Layout>
  );
}
