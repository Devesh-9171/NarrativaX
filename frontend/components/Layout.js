import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const INPUT_CLASS = 'bg-gray-900 text-white placeholder-gray-400 border border-gray-700';

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    setDarkMode(shouldUseDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const submitSearch = (e) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;
    setMenuOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.1),_transparent_60%)]">
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/" className="group flex items-center gap-2 text-xl font-bold" aria-label="ReadNovaX home">
            <span className="brand-logo-text">ReadNovaX</span>
          </Link>

          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded border px-2 py-1 text-sm md:hidden"
            aria-label="Toggle menu"
          >
            Menu
          </button>

          <form onSubmit={submitSearch} className="order-3 flex w-full gap-2 md:order-none md:ml-auto md:w-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full rounded px-3 py-1.5 text-sm md:w-64 ${INPUT_CLASS}`}
              placeholder="Search books..."
              aria-label="Search books"
            />
            <button className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white">Search</button>
          </form>

          <nav className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-wrap gap-4 text-sm font-medium md:flex md:w-auto`}>
            <Link href="/category/action">Action</Link>
            <Link href="/category/romance">Romance</Link>
            <Link href="/category/comedy">Comedy</Link>
            <Link href="/profile">Profile</Link>
            <Link href="/admin">Admin</Link>
            <Link href="/auth/login">Login</Link>
            <Link href="/auth/signup">Sign Up</Link>
            <button onClick={() => setDarkMode((value) => !value)} className="rounded border px-2 py-0.5">
              {darkMode ? 'Light' : 'Dark'}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="border-t py-8 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-medium">
            <Link href="/about" className="transition hover:text-brand-600 dark:hover:text-sky-300">About</Link>
            <Link href="/contact" className="transition hover:text-brand-600 dark:hover:text-sky-300">Contact</Link>
            <Link href="/terms" className="transition hover:text-brand-600 dark:hover:text-sky-300">Terms</Link>
          </nav>
          <p>© {new Date().getFullYear()} ReadNovaX. Read brighter.</p>
        </div>
      </footer>
    </div>
  );
}
