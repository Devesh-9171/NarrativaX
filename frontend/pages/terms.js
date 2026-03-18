import InfoPage from '../components/InfoPage';

const terms = [
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
    body: 'You are responsible for maintaining the confidentiality of your login details.'
  },
  {
    title: 'Content Rights',
    body: 'We aim to upload only safe and verified content. If you believe any content violates rights, please contact us.'
  },
  {
    title: 'Changes to Service',
    body: 'We may update or modify the platform at any time without prior notice.'
  },
  {
    title: 'Limitation of Liability',
    body: 'We are not responsible for any loss or damage resulting from the use of this website.'
  }
];

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms and Conditions"
      description="Read the ReadNovaX terms and conditions for platform usage, account responsibility, and content rights."
      path="/terms"
    >
      <p>Welcome to ReadNovaX. By using our website, you agree to the following terms:</p>
      <ol className="space-y-4 pl-5">
        {terms.map((term) => (
          <li key={term.title} className="list-decimal">
            <span className="font-semibold">{term.title}</span>
            <p className="mt-1">{term.body}</p>
          </li>
        ))}
      </ol>
      <p>By continuing to use ReadNovaX, you agree to these terms.</p>
    </InfoPage>
  );
}
