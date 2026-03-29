import InfoPage from '../components/InfoPage';

const termsSections = [
  {
    title: '1. Introduction',
    paragraphs: [
      'Welcome to ReadNovaX. By accessing or using our platform, you agree to comply with and be bound by these Terms & Conditions.'
    ]
  },
  {
    title: '2. Content Ownership',
    paragraphs: [
      'All authors retain ownership of their content. However, by publishing on ReadNovaX, you grant us the right to display, distribute, and promote your content on our platform.'
    ]
  },
  {
    title: '3. Author Responsibility',
    paragraphs: [
      'Authors are solely responsible for the content they publish. All content must be original and must not violate any copyright, trademark, or intellectual property rights.',
      'Any form of plagiarism, copied content, or unauthorized use of material is strictly prohibited.'
    ]
  },
  {
    title: '4. Platform Rights',
    paragraphs: ['ReadNovaX reserves the right to:'],
    items: [
      'Remove any content that violates our policies',
      'Suspend or terminate author accounts without prior notice',
      'Take necessary actions against misuse of the platform'
    ]
  },
  {
    title: '5. Payments',
    paragraphs: [
      'Payments to authors are based on platform-defined metrics (such as views) and are managed manually. ReadNovaX reserves the right to modify payment structures at any time.'
    ]
  },
  {
    title: '6. Limitation of Liability',
    paragraphs: [
      'ReadNovaX is not responsible for any legal issues arising from user-generated content. Authors bear full responsibility for their submissions.'
    ]
  },
  {
    title: '7. Account Suspension',
    paragraphs: [
      'Accounts found violating terms (including plagiarism or misuse) may be suspended or permanently banned.'
    ]
  },
  {
    title: '8. Changes to Terms',
    paragraphs: [
      'We may update these Terms & Conditions at any time. Continued use of the platform means you accept the updated terms.'
    ]
  }
];

export default function TermsPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <InfoPage
      title="Terms & Conditions – ReadNovaX"
      description="Review the official Terms & Conditions for ReadNovaX, including author obligations, platform rights, content ownership, payments, and account enforcement rules."
      path="/terms"
    >
      <p className="text-sm font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Last Updated: <span className="normal-case tracking-normal">{lastUpdated}</span>
      </p>

      <div className="space-y-6 pt-2">
        {termsSections.map((section) => (
          <article key={section.title} className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.items ? (
              <ul className="list-disc space-y-2 pl-6">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </InfoPage>
  );
}
