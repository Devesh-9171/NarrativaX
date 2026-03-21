import Image from 'next/image';
import Link from 'next/link';

const LANGUAGE_LABELS = {
  en: 'EN',
  hi: 'HI'
};

function getOptimizedCoverImage(src) {
  if (!src) return '/images/logo.svg';

  if (!src.includes('res.cloudinary.com')) {
    return src;
  }

  if (/\/upload\/(?:[^/]*,)?f_auto,q_auto,w_300/.test(src)) {
    return src;
  }

  return src.replace('/upload/', '/upload/f_auto,q_auto,w_300/');
}

export default function BookCard({ book, priority = false }) {
  const coverImage = getOptimizedCoverImage(book.coverImage);

  return (
    <article className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-[5/7] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <Image
          src={coverImage}
          alt={book.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
          quality={75}
        />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 font-semibold">{book.title}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {LANGUAGE_LABELS[book.language] || 'EN'}
          </span>
        </div>
        <p className="text-sm text-slate-500">{book.author}</p>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="rounded bg-slate-100 px-2 py-1 capitalize dark:bg-slate-800">{book.category}</span>
          <span>⭐ {book.rating}</span>
        </div>
        <p className="text-xs text-slate-500">{book.totalViews.toLocaleString()} reads</p>
        <Link href={`/book/${book.slug}${book.language === 'hi' ? '?lang=hi' : ''}`} className="block rounded bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white">
          Read Now
        </Link>
      </div>
    </article>
  );
}
