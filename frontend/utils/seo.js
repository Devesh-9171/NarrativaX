export function buildMeta({ title, description, image, path = '' }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${site}${path}`;
  return { title, description, image, url };
}
