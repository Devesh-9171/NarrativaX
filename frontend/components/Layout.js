import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

const INPUT_CLASS = 'border border-slate-300 bg-white text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500';
const NAV_LINK_CLASS = 'transition hover:text-brand-600 dark:hover:text-sky-300';
const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/disclaimer', label: 'Disclaimer' },
  { href: '/blog', label: 'Blog' }
];

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { isDark, toggleTheme } = useTheme();
  const { user, token, clearAuthState } = useAuth();
  const router = useRouter();
  const authenticated = Boolean(token);

  const navItems = useMemo(
    () => [
      { href: '/category/action', label: 'Action' },
      { href: '/category/romance', label: 'Romance' },
      { href: '/category/comedy', label: 'Comedy' },
      { href: '/blog', label: 'Blog' },
      { href: '/profile', label: 'Profile' }
    ],
    []
  );

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    setMenuOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleLogout = async () => {
    await clearAuthState();
    setMenuOpen(false);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_55%)] bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/" className="group flex items-center gap-2 text-xl font-bold" aria-label="ReadNovaX home">
            <span className="brand-logo-text">ReadNovaX</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="ml-auto rounded-full border border-slate-300 px-3 py-1.5 text-sm md:hidden dark:border-slate-700"
            aria-label="Toggle menu"
          >
            Menu
          </button>

          <form onSubmit={submitSearch} className="order-3 flex w-full gap-2 md:order-none md:ml-auto md:w-auto">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`w-full rounded-full px-4 py-2 text-sm shadow-sm md:w-64 ${INPUT_CLASS}`}
              placeholder="Search books..."
              aria-label="Search books"
            />
            <button type="submit" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500">
              Search
            </button>
          </form>

          <nav className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-3 text-sm font-medium md:flex md:w-auto md:flex-row md:items-center md:gap-4`}>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={NAV_LINK_CLASS}>
                {item.label}
              </Link>
            ))}

            {user?.role === 'author' ? <Link href="/author" className={NAV_LINK_CLASS}>Author</Link> : null}
            {user?.role === 'admin' ? <Link href="/admin" className={NAV_LINK_CLASS}>Admin</Link> : null}

            {authenticated ? (
              <button type="button" onClick={handleLogout} className="rounded-full border border-slate-300 px-3 py-1.5 text-left transition hover:border-red-400 hover:text-red-500 dark:border-slate-700 dark:hover:border-red-400 dark:hover:text-red-300">
                Logout
              </button>
            ) : (
              <>
                <Link href="/auth/login" className={NAV_LINK_CLASS}>Login</Link>
                <Link href="/auth/signup" className="rounded-full bg-slate-900 px-3 py-1.5 text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                  Sign Up
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border border-slate-300 px-3 py-1.5 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:hover:border-sky-400 dark:hover:text-sky-300"
            >
              {isDark ? 'Light' : 'Dark'}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 py-8 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-[1.2fr_minmax(0,1fr)] sm:items-start sm:text-left">
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">ReadNovaX</p>
            <p className="mt-2 max-w-md leading-6">A clean, mobile-friendly reading platform for novels, updates, and blog content that is ready for growth and AdSense-friendly navigation.</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Quick links</p>
            <nav className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 font-medium sm:grid-cols-1 md:grid-cols-2">
              {FOOTER_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="transition hover:text-brand-600 dark:hover:text-sky-300">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="sm:col-span-2 sm:text-center">© {new Date().getFullYear()} ReadNovaX. Read brighter.</p>
        </div>
      </footer>
    </div>
  );
}
