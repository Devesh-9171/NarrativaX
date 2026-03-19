import InfoPage from '../components/InfoPage';

const sections = [
  {
    title: 'Information We Collect',
    body: 'We may collect basic user information such as name and email during account registration. We also collect usage data to improve our services.'
  },
  {
    title: 'How We Use Information',
    items: [
      'To provide and improve our reading platform',
      'To personalize user experience',
      'To communicate important updates'
    ]
  },
  {
    title: 'Cookies',
    body: 'We use cookies to enhance user experience and analyze site traffic.'
  },
  {
    title: 'Third-Party Services',
    body: 'We may use third-party services like Google AdSense which may collect data using cookies.'
  },
  {
    title: 'Data Security',
    body: 'We take appropriate measures to protect your data but cannot guarantee absolute security.'
  },
  {
    title: 'User Rights',
    body: 'Users can request deletion of their account and data anytime.'
  },
  {
    title: 'Changes to Policy',
    body: 'We may update this policy from time to time.'
  },
  {
    title: 'Contact Us',
    body: 'For any questions, contact us at support@readnovax.in.'
  }
];

export default function PrivacyPolicyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      description="Privacy Policy – ReadNovaX. Learn how we collect, use, and protect personal information on our reading platform."
      path="/privacy-policy"
    >
      <p className="text-lg font-medium text-slate-900 dark:text-white">Privacy Policy – ReadNovaX</p>
      <p>At ReadNovaX, we value your privacy and are committed to protecting your personal information.</p>

      <div className="space-y-4">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{section.title}</h2>
            {section.body ? <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{section.body}</p> : null}
            {section.items ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {section.items.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </InfoPage>
  );
}
