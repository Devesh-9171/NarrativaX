import { buildSitemapXml, validateSitemapXml, createFallbackSitemap } from '../utils/sitemap';

const XML_CONTENT_TYPE = 'application/xml; charset=utf-8';
const XML_DEBUG_PREVIEW_LENGTH = 200;

export default function SiteMap() {
  return null;
}

function normalizeResponseHelpers(res) {
  if (typeof res.status !== 'function') {
    res.status = function status(code) {
      this.statusCode = code;
      return this;
    };
  }

  if (typeof res.send !== 'function') {
    res.send = function send(body) {
      this.end(body);
      return this;
    };
  }

  return res;
}

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

function sendRawXmlResponse(res, xml) {
  const response = normalizeResponseHelpers(res);
  response.setHeader('Content-Type', XML_CONTENT_TYPE);
  response.setHeader('Cache-Control', 'no-store, max-age=0, no-transform');
  response.setHeader('Content-Encoding', 'identity');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Length', Buffer.byteLength(xml, 'utf8'));

  const debugHeaders = {
    'content-type': response.getHeader('Content-Type'),
    'cache-control': response.getHeader('Cache-Control'),
    'content-encoding': response.getHeader('Content-Encoding'),
    'content-length': response.getHeader('Content-Length'),
    'x-content-type-options': response.getHeader('X-Content-Type-Options')
  };
  const xmlPreview = xml.slice(0, XML_DEBUG_PREVIEW_LENGTH);
  console.info('[sitemap] Final XML response headers:', debugHeaders);
  console.info(`[sitemap] Final XML preview (first ${XML_DEBUG_PREVIEW_LENGTH} chars): ${xmlPreview}`);

  response.status(200).send(xml);
}

export async function getServerSideProps({ res }) {
  const fallbackGeneratedAt = new Date().toISOString();
  let xml;

  try {
    xml = await buildSitemapXml();
  } catch (error) {
    console.error('[sitemap] Failed to build sitemap XML response. Returning minimal fallback.', error);
    xml = createFallbackSitemap(fallbackGeneratedAt);
  }

  const finalXml = getValidatedXmlOrFallback(xml, fallbackGeneratedAt);
  sendRawXmlResponse(res, finalXml);

  return { props: {} };
}
