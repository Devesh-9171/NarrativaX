import api from '../../utils/api';

export default function ShortStoriesIndex() {
  return null;
}

export async function getServerSideProps() {
  try {
    const { data } = await api.get('/books/short-stories/reel', { params: { limit: 1 } });
    const first = data?.stories?.[0];
    if (!first) return { notFound: true };
    return {
      redirect: {
        destination: `/short-stories/${first.slug}`,
        permanent: false
      }
    };
  } catch (_error) {
    return { notFound: true };
  }
}
