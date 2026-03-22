const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://readnovax.in').replace(/\/$/, '');
const PRIMARY_HOST = 'www.readnovax.in';
const LEGACY_HOST = 'readnovax.in';

const SITEMAP_HEADERS = [
  {
    key: 'Content-Type',
    value: 'application/xml; charset=utf-8'
  },
  {
    key: 'Content-Encoding',
    value: 'identity'
  },
  {
    key: 'Cache-Control',
    value: 'no-store, max-age=0, no-transform'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
];


/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: false,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/:path((?!sitemap\\.xml$|api/sitemap\\.xml$).*)',
        has: [
          {
            type: 'host',
            value: LEGACY_HOST
          }
        ],
        destination: `https://${PRIMARY_HOST}/:path*`,
        permanent: true
      }
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/sitemap.xml',
          destination: '/api/sitemap.xml'
        },
        {
          source: '/api/sitemap.xml',
          destination: '/api/sitemap.xml'
        }
      ]
    };
  },
  async headers() {
    return [
      {
        source: '/sitemap.xml',
        headers: SITEMAP_HEADERS
      },
      {
        source: '/api/sitemap.xml',
        headers: SITEMAP_HEADERS
      }
    ];
  },
  env: {
    NEXT_PUBLIC_SITE_URL: SITE_URL
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60
  }
};

module.exports = nextConfig;
