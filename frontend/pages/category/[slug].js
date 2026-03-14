import Layout from '../../components/Layout';
import BookCard from '../../components/BookCard';
import SeoHead from '../../components/SeoHead';
import api from '../../utils/api';
import { buildMeta } from '../../utils/seo';

export default function CategoryPage({ slug, books }) {
  const meta = buildMeta({
    title: `${slug} Books | NarrativaX`,
    description: `Browse ${slug} novels and books on NarrativaX`,
    image: '/images/logo.svg',
    path: `/category/${slug}`
  });

  return (
    <Layout>
      <SeoHead {...meta} />
      <h1 className="mb-6 text-3xl font-bold capitalize">{slug} Books</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {books.map((book) => <BookCard key={book._id} book={book} />)}
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  const { data } = await api.get(`/books/category/${params.slug}`);
  return { props: { slug: params.slug, books: data } };
}
