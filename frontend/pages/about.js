import InfoPage from '../components/InfoPage';

export default function AboutPage() {
  return (
    <InfoPage
      title="About Us"
      description="Learn more about ReadNovaX and its mission to provide a smooth, distraction-free reading experience."
      path="/about"
    >
      <p>ReadNovaX is a modern online platform designed for reading novels and books in a simple and smooth way.</p>
      <p>Our goal is to provide readers with an enjoyable and distraction-free reading experience. We focus on clean design, easy navigation, and high-quality content.</p>
      <p>At ReadNovaX, we carefully upload and manage books to ensure a safe and reliable platform for all users.</p>
      <p>Whether you love action, romance, or storytelling, ReadNovaX is built to help you read better and explore more.</p>
      <p className="font-semibold">📚 Read smarter. Read better. ReadNovaX.</p>
    </InfoPage>
  );
}
