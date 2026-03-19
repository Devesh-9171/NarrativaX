import InfoPage from '../components/InfoPage';

const disclaimerPoints = [
  'All content on ReadNovaX is for informational and entertainment purposes only.',
  'We do not guarantee the accuracy or completeness of any content published on the site.',
  'We are not responsible for any loss or damage that may arise from using the website or relying on its content.',
  'Third-party advertisements, such as Google AdSense, may appear on ReadNovaX, and we do not control or endorse their content.'
];

export default function DisclaimerPage() {
  return (
    <InfoPage
      title="Disclaimer"
      description="Read the ReadNovaX disclaimer for content limitations, liability, and third-party advertising notices."
      path="/disclaimer"
    >
      <ul className="space-y-4">
        {disclaimerPoints.map((point) => (
          <li key={point} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            {point}
          </li>
        ))}
      </ul>
    </InfoPage>
  );
}
