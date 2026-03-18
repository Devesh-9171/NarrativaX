import InfoPage from '../components/InfoPage';

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact Us"
      description="Contact ReadNovaX for questions, suggestions, issues, or author publishing inquiries."
      path="/contact"
    >
      <p>If you have any questions, suggestions, or issues while using ReadNovaX, feel free to contact us.</p>
      <p>
        <span className="mr-2" aria-hidden="true">📧</span>
        Email:{' '}
        <a className="font-semibold text-blue-600 hover:underline dark:text-sky-300" href="mailto:readnovax@gmail.com">
          readnovax@gmail.com
        </a>
      </p>
      <p>If you are an author and want to publish your book with us, feel free to reach out via email.</p>
      <p>We usually respond within 24–48 hours.</p>
      <p>Thank you for using ReadNovaX ❤️</p>
    </InfoPage>
  );
}
