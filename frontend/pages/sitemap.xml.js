import api from '../utils/api';

function generateSiteMap(origin, books = []) {
  const staticUrls = ['', '/category/action', '/category/romance', '/category/comedy', '/category/mystery', '/category/finance'];
  const urls = staticUrls.map((path) => `<url><loc>${origin}${path}</loc></url>`);

  books.forEach((book) => {
    urls.push(`<url><loc>${origin}/books/${book.slug}</loc></url>`);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
}

export async function getServerSideProps({ res }) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { data: books } = await api.get('/books');
  const sitemap = generateSiteMap(origin, books);

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return { props: {} };
}

export default function Sitemap() {
  return null;
}
