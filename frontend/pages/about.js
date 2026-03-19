import InfoPage from '../components/InfoPage';

const highlights = [
  {
    title: 'Clean reading experience',
    body: 'We focus on distraction-free pages, responsive layouts, and easy chapter navigation so readers can stay immersed.'
  },
  {
    title: 'Curated storytelling',
    body: 'From action to romance, we organize engaging stories and updates in a simple structure that is easy to browse.'
  },
  {
    title: 'Built for every screen',
    body: 'ReadNovaX is designed to feel smooth on phones, tablets, and desktops with consistent spacing and accessible layouts.'
  }
];

export default function AboutPage() {
  return (
    <InfoPage
      title="About Us"
      description="Learn more about ReadNovaX and its mission to provide a smooth, distraction-free reading experience."
      path="/about"
    >
      <p>ReadNovaX is a modern online reading platform built for people who want stories, updates, and useful content in a clean and reliable format.</p>
      <p>Our goal is to make reading feel effortless with polished navigation, mobile-friendly design, and thoughtfully organized content across books, chapters, and blog posts.</p>

      <div className="grid gap-4 pt-2 md:grid-cols-3">
        {highlights.map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p>
          </div>
        ))}
      </div>

      <p>We continue improving ReadNovaX so readers can discover more, read comfortably, and return to a platform that feels fast, familiar, and enjoyable every day.</p>
      <p className="font-semibold text-slate-900 dark:text-white">📚 Read smarter. Read better. ReadNovaX.</p>
    </InfoPage>
  );
}
