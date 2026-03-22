import { buildSitemapXml, validateSitemapXml, createFallbackSitemap } from '../../utils/sitemap';

const XML_CONTENT_TYPE = 'application/xml; charset=utf-8';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
    externalResolver: true
  }
};

function getValidatedXmlOrFallback(xml, fallbackGeneratedAt) {
  try {
    validateSitemapXml(xml);
    return xml;
  } catch (error) {
    console.error('[sitemap] Invalid XML detected before response. Returning minimal fallback.', error);
    const fallbackXml = createFallbackSitemap(fallbackGeneratedAt);
    validateSitemapXml(fallbackXml);
    return fallbackXml;
  }
}

export default async function sitemapHandler(req, res) {
  const fallbackGeneratedAt = new Date().toISOString();
  let xml;

  try {
    xml = await buildSitemapXml();
  } catch (error) {
    console.error('[sitemap] Failed to build sitemap XML response. Returning minimal fallback.', error);
    xml = createFallbackSitemap(fallbackGeneratedAt);
  }

  const finalXml = getValidatedXmlOrFallback(xml, fallbackGeneratedAt);

  res.statusCode = 200;
  res.setHeader('Content-Type', XML_CONTENT_TYPE);
  res.setHeader('Cache-Control', 'no-store, max-age=0, no-transform');
  res.setHeader('Content-Encoding', 'identity');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', Buffer.byteLength(finalXml, 'utf8'));
  res.write(finalXml);
  res.end();
}
