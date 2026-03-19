import InfoPage from '../components/InfoPage';

const terms = [
  {
    title: 'Eligibility',
    body: 'You must be at least 13 years old to use this website.'
  },
  {
    title: 'Content Usage',
    body: 'All books and content on this platform are for reading purposes only. You may not copy, reproduce, or distribute content without permission.'
  },
  {
    title: 'User Responsibility',
    body: 'Users must not misuse the platform or attempt to harm the website in any way.'
  },
  {
    title: 'Account Usage',
    body: 'You are responsible for maintaining the confidentiality of your login details, and we reserve the right to suspend or terminate any account that violates our terms.'
  },
  {
    title: 'Content Rights',
    body: 'We aim to upload only safe and verified content. If you believe any content violates rights, please contact us.'
  },
  {
    title: 'Advertising',
    body: 'We may display third-party advertisements, including Google AdSense, and we are not responsible for the content, claims, or behavior of those ads.'
  },
  {
    title: 'Changes to Service',
    body: 'We may update, modify, suspend, or discontinue parts of the platform at any time without prior notice.'
  },
  {
    title: 'Limitation of Liability',
    body: 'We are not responsible for any loss or damage resulting from the use of this website.'
  },
  {
    title: 'Governing Law',
    body: 'These terms are governed by the laws of India.'
  }
];

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms and Conditions"
      description="Read the ReadNovaX terms and conditions for platform usage, account responsibility, advertising disclosures, and governing law."
      path="/terms"
    >
      <p>Welcome to ReadNovaX. By using our website, you agree to the following terms and conditions:</p>
      <ol className="space-y-4 pl-5">
        {terms.map((term) => (
          <li key={term.title} className="list-decimal pl-1">
            <span className="font-semibold text-slate-900 dark:text-white">{term.title}</span>
            <p className="mt-1">{term.body}</p>
          </li>
        ))}
      </ol>
      <p>By continuing to use ReadNovaX, you agree to these terms.</p>
    </InfoPage>
  );
}
