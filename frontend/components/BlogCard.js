import Image from 'next/image';
import Link from 'next/link';

function formatDate(date) {
  if (!date) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date));
}

export default function BlogCard({ post, priority = false }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950">
      <Link href={`/blog/${post.slug}`} className="block h-full">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-200 dark:bg-slate-800">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            priority={priority}
          />
        </div>
        <div className="flex h-full flex-col space-y-3 p-5">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{formatDate(post.publishedAt)}</p>
          <h2 className="text-xl font-semibold leading-tight text-slate-900 transition group-hover:text-brand-600 dark:text-white dark:group-hover:text-sky-300">{post.title}</h2>
          {post.description ? <p className="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{post.description}</p> : null}
          <span className="inline-flex items-center pt-1 text-sm font-semibold text-brand-600 dark:text-sky-300">Read article →</span>
        </div>
      </Link>
    </article>
  );
}
