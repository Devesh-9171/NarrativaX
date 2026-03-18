import Layout from './Layout';
import SeoHead from './SeoHead';
import { buildMeta } from '../utils/seo';

export default function InfoPage({ title, description, path, children }) {
  const meta = buildMeta({
    title: `${title} | ReadNovaX`,
    description,
    image: '/images/logo.svg',
    path
  });

  return (
    <Layout>
      <SeoHead {...meta} />
      <section className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <h1 className="mb-6 text-3xl font-bold sm:text-4xl">{title}</h1>
        <div className="space-y-4 leading-7 text-slate-700 dark:text-slate-200">
          {children}
        </div>
      </section>
    </Layout>
  );
}
