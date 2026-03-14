import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../utils/api';

export default function ProfilePage() {
  const [me, setMe] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/user/me', { headers: { Authorization: `Bearer ${token}` } }).then((res) => setMe(res.data));
  }, []);

  return (
    <Layout>
      <h1 className="mb-4 text-3xl font-bold">Reader Profile</h1>
      {!me ? <p>Please login to view your profile.</p> : (
        <div className="space-y-4">
          <p><strong>{me.username}</strong> ({me.email})</p>
          <section>
            <h2 className="font-semibold">Favorite Books</h2>
            <ul className="list-disc pl-5">{me.favoriteBooks.map((b) => <li key={b._id}>{b.title}</li>)}</ul>
          </section>
          <section>
            <h2 className="font-semibold">Bookmarks</h2>
            <ul className="list-disc pl-5">{me.bookmarks.map((c) => <li key={c._id}>{c.title}</li>)}</ul>
          </section>
        </div>
      )}
    </Layout>
  );
}
