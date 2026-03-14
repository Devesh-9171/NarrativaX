import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../utils/api';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/auth/login', form);
    localStorage.setItem('token', data.token);
    router.push('/profile');
  };

  return (
    <Layout>
      <form onSubmit={submit} className="mx-auto max-w-md space-y-3 rounded-xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold">Login</h1>
        <input className="w-full rounded border p-2" placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full rounded border p-2" type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="w-full rounded bg-brand-600 py-2 text-white">Sign In</button>
      </form>
    </Layout>
  );
}
