import { useEffect, useState } from 'react';
import Router from 'next/router';
import Script from 'next/script';
import '../styles/globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

function RouteLoadingOverlay() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100]">
      <div className="h-1 w-full overflow-hidden bg-transparent">
        <div className="route-loading-bar h-full w-1/3 rounded-full bg-gradient-to-r from-fuchsia-500 via-sky-400 to-cyan-300" />
      </div>
      <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-sky-200/70 bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg shadow-sky-100/70 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-200 dark:shadow-slate-950/30">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-400 route-loading-pulse" aria-hidden="true" />
        Fetching fresh data…
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setIsRouteLoading(true);
    const handleDone = () => setIsRouteLoading(false);

    Router.events.on('routeChangeStart', handleStart);
    Router.events.on('routeChangeComplete', handleDone);
    Router.events.on('routeChangeError', handleDone);

    return () => {
      Router.events.off('routeChangeStart', handleStart);
      Router.events.off('routeChangeComplete', handleDone);
      Router.events.off('routeChangeError', handleDone);
    };
  }, []);

  return (
    <>
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-script" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`}
          </Script>
        </>
      )}
      <ThemeProvider>
        <AuthProvider>
          {isRouteLoading && <RouteLoadingOverlay />}
          <Component {...pageProps} />
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}
