import { buildSitemapXml, validateSitemapXml, createFallbackSitemap } from '../utils/sitemap';

export default function SiteMap() {
  return null;
}

export async function getServerSideProps({ res }) {
  let xml;

  try {
    xml = await buildSitemapXml();
    validateSitemapXml(xml);
  } catch (error) {
    console.error('[sitemap] Failed to build sitemap XML response. Returning minimal fallback.', error);
    xml = createFallbackSitemap(new Date().toISOString());
    validateSitemapXml(xml);
  }

  console.info(`[sitemap] Sending XML response:
${xml}`);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(xml);

  return { props: {} };
}
