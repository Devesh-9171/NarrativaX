import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../utils/api';

export default function SignupPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/auth/signup', form);
    router.push('/auth/login');
  };

  return (
    <Layout>
      <form onSubmit={submit} className="mx-auto max-w-md space-y-3 rounded-xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <input className="w-full rounded border p-2" placeholder="Username" onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className="w-full rounded border p-2" placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full rounded border p-2" type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="w-full rounded bg-brand-600 py-2 text-white">Sign Up</button>
      </form>
    </Layout>
  );
}
