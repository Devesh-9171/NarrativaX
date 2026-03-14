import Image from 'next/image';
import Link from 'next/link';

export default function BookCard({ book }) {
  return (
    <article className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900">
      <div className="relative h-56 w-full">
        <Image src={book.coverImage} alt={book.title} fill className="object-cover" />
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-semibold">{book.title}</h3>
        <p className="text-sm text-slate-500">{book.author}</p>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="rounded bg-slate-100 px-2 py-1 capitalize dark:bg-slate-800">{book.category}</span>
          <span>⭐ {book.rating}</span>
        </div>
        <p className="text-xs text-slate-500">{book.totalViews.toLocaleString()} reads</p>
        <Link href={`/books/${book.slug}`} className="block rounded bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white">
          Read Now
        </Link>
      </div>
    </article>
  );
}
