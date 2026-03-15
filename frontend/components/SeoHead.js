import Head from 'next/head';

export default function SeoHead({ title, description, image, url, structuredData, noIndex = false }) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="theme-color" content="#2563eb" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noIndex ? 'noindex,nofollow' : 'index,follow'} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="ReadNovaX" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {structuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      )}
    </Head>
  );
}
