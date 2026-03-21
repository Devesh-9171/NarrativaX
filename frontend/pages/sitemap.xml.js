import { buildSitemapXml } from '../utils/sitemap';

export default function SiteMap() {
  return null;
}

export async function getServerSideProps({ res }) {
  try {
    const xml = await buildSitemapXml();

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.write(xml);
    res.end();
  } catch (error) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.write(`Sitemap generation failed: ${error.message}`);
    res.end();
  }

  return { props: {} };
}
