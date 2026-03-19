import InfoPage from '../components/InfoPage';

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact Us"
      description="Contact ReadNovaX for questions, suggestions, issues, or author publishing inquiries."
      path="/contact"
    >
      <p>If you have any questions, suggestions, partnership ideas, or issues while using ReadNovaX, feel free to get in touch with us.</p>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Email support</p>
        <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
          <a className="text-blue-600 hover:underline dark:text-sky-300" href="mailto:readnovax@gmail.com">
            readnovax@gmail.com
          </a>
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">We usually respond within 24–48 hours.</p>
      </div>
      <p>If you are an author and want to publish your book with us, feel free to reach out via email and include your project details.</p>
      <p>Thank you for using ReadNovaX ❤️</p>
    </InfoPage>
  );
}
