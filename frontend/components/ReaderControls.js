export default function ReaderControls({ settings, setSettings, onBookmark }) {
  return (
    <div className="sticky top-16 z-30 mb-6 flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <button onClick={() => setSettings((s) => ({ ...s, dark: !s.dark }))} className="rounded border px-3 py-1 text-sm">
        {settings.dark ? 'Light' : 'Dark'}
      </button>
      <label className="text-sm">Font
        <input type="range" min="16" max="24" value={settings.fontSize} onChange={(e) => setSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))} />
      </label>
      <label className="text-sm">Line
        <input type="range" min="1.4" max="2.2" step="0.1" value={settings.lineHeight} onChange={(e) => setSettings((s) => ({ ...s, lineHeight: Number(e.target.value) }))} />
      </label>
      <button onClick={onBookmark} className="rounded bg-brand-600 px-3 py-1 text-sm text-white">Bookmark</button>
    </div>
  );
}
