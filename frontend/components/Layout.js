import Link from 'next/link';
import Image from 'next/image';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur dark:bg-slate-900/90 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-600">
            <Image src="/images/logo.svg" alt="NarrativaX" width={40} height={40} />
            NarrativaX
          </Link>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/category/action">Action</Link>
            <Link href="/category/romance">Romance</Link>
            <Link href="/category/comedy">Comedy</Link>
            <Link href="/profile">Profile</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="border-t py-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
        © {new Date().getFullYear()} NarrativaX. Read smarter.
      </footer>
    </div>
  );
}
