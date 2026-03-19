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
      <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8 lg:p-10">
        <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-brand-600 dark:text-sky-300">ReadNovaX</p>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        <div className="space-y-5 text-base leading-7 text-slate-700 dark:text-slate-200">{children}</div>
      </section>
    </Layout>
  );
}
