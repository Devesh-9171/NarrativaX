export default function AdSlot({ label = 'AdSense Slot', className = '' }) {
  return (
    <div className={`rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700 ${className}`}>
      {label} (client: {process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-xxxxxxxxxxxxxxxx'})
    </div>
  );
}
