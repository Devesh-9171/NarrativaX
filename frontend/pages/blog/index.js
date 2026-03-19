import Layout from '../../components/Layout';
import SeoHead from '../../components/SeoHead';
import BlogCard from '../../components/BlogCard';
import api from '../../utils/api';
import { buildMeta } from '../../utils/seo';

export default function BlogIndexPage({ posts, error }) {
  const meta = buildMeta({
    title: 'ReadNovaX Blog | Reading tips, updates, and guides',
    description: 'Explore the latest ReadNovaX articles, reading guides, feature updates, and curated recommendations.',
    image: posts[0]?.coverImage || '/images/logo.svg',
    path: '/blog'
  });

  return (
    <Layout>
      <SeoHead
        {...meta}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'ReadNovaX Blog',
          url: meta.url,
          description: meta.description
        }}
      />

      <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-brand-600 dark:text-sky-300">Blog</p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Fresh reading insights for the ReadNovaX community</h1>
            <p className="mt-4 max-w-3xl text-slate-600 dark:text-slate-300">
              Browse every ReadNovaX article in one place, sorted with the newest posts first and designed for clean reading on desktop and mobile.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">What you&apos;ll find</p>
            <ul className="mt-3 space-y-2">
              <li>• Platform updates and announcements</li>
              <li>• Reading guides and recommendations</li>
              <li>• Fast, mobile-friendly article browsing</li>
            </ul>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-base font-medium text-slate-500 dark:border-slate-700 dark:text-slate-300">
          No blog posts yet
        </div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post, index) => <BlogCard key={post._id || post.slug} post={post} priority={index < 3} />)}
        </section>
      )}
    </Layout>
  );
}

export async function getServerSideProps() {
  try {
    const { data } = await api.get('/blog', { params: { limit: 100 } });
    return { props: { posts: data.data || [], error: null } };
  } catch (error) {
    return { props: { posts: [], error: error.message } };
  }
}
