import ChapterReaderPage from '../../components/ChapterReaderPage';
import api from '../../utils/api';

export default ChapterReaderPage;

export async function getServerSideProps({ params }) {
  try {
    const { data } = await api.get(`/chapters/${params.slug}/${params.chapterSlug}`);
    return { props: { ...data, isFallback: false } };
  } catch (_error) {
    return {
      props: {
        book: null,
        chapter: null,
        chapters: [],
        previousChapter: null,
        nextChapter: null,
        isFallback: true
      }
    };
  }
}
