import { Head, Html, Main, NextScript } from 'next/document';
import { getThemeInitScript } from '../utils/theme';

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head />
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
