import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../utils/api';

export default function AdminPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/admin/stats', { headers: { Authorization: `Bearer ${token}` } }).then((res) => setStats(res.data));
  }, []);

  return (
    <Layout>
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>
      {!stats ? <p>Login as admin to view analytics.</p> : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card label="Books" value={stats.totalBooks} />
          <Card label="Chapters" value={stats.totalChapters} />
          <Card label="Total Views" value={stats.totalViews} />
        </div>
      )}
    </Layout>
  );
}

function Card({ label, value }) {
  return <div className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm">{label}</p><p className="text-2xl font-bold">{value}</p></div>;
}
