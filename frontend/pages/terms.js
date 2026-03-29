import InfoPage from '../components/InfoPage';

const termsSections = [
  {
    title: '1. Introduction',
    paragraphs: [
      'Welcome to ReadNovaX. These Terms & Conditions apply to all visitors, readers, and registered users of our platform.',
      'By accessing or using ReadNovaX, you agree to comply with these Terms & Conditions and all applicable laws.'
    ]
  },
  {
    title: '2. Platform Usage Rules',
    paragraphs: [
      'You agree to use ReadNovaX in a lawful and respectful manner and must not misuse the platform, attempt unauthorized access, or interfere with service operations.',
      'ReadNovaX may suspend, restrict, or terminate access for users who violate platform rules, abuse features, or harm other users.'
    ]
  },
  {
    title: '3. Content Usage',
    paragraphs: [
      'All content available on ReadNovaX is provided for personal reading and discovery unless otherwise permitted by the content owner or law.',
      'You must not copy, reproduce, redistribute, or commercially exploit content from the platform without proper authorization.'
    ]
  },
  {
    title: '4. Account Rules',
    paragraphs: ['If you create an account, you are responsible for maintaining account security and accurate profile information.'],
    items: [
      'Keep your login credentials secure and confidential',
      'Provide truthful registration details and keep them updated',
      'Avoid creating multiple accounts for abuse, fraud, or policy evasion',
      'Accept responsibility for activities performed through your account'
    ]
  },
  {
    title: '5. Liability & Disclaimer',
    paragraphs: [
      'ReadNovaX is provided on an “as available” basis. While we strive for reliability and quality, uninterrupted access is not guaranteed.',
      'To the maximum extent permitted by law, ReadNovaX is not liable for indirect, incidental, or consequential losses arising from platform usage.'
    ]
  },
  {
    title: '6. Platform Rights',
    paragraphs: ['ReadNovaX reserves the right to:'],
    items: [
      'Moderate, remove, or restrict access to content or accounts that violate policies or law',
      'Update platform features, services, and terms as needed',
      'Take necessary action to protect users, content owners, and platform integrity'
    ]
  },
  {
    title: '7. Privacy',
    paragraphs: [
      'Your use of ReadNovaX is also governed by our Privacy Policy, which explains how user data is collected and used.'
    ]
  },
  {
    title: '8. Changes to Terms & Conditions',
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
      description="Review the official Terms & Conditions for ReadNovaX, including platform usage rules, content usage, liability, and account rules for all users."
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
