const BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-400 dark:hover:text-sky-300';

export default function ReaderControls({ settings, theme, onDecreaseFont, onIncreaseFont, onToggleTheme, onFamilyChange, chapterOptions, currentChapterSlug, onJumpToChapter, onBookmark }) {
  return (
    <div className="sticky top-[72px] z-30 mb-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Reader tools</span>
          <button type="button" onClick={onDecreaseFont} className={BUTTON_CLASS} aria-label="Decrease font size">
            A-
          </button>
          <button type="button" onClick={onIncreaseFont} className={BUTTON_CLASS} aria-label="Increase font size">
            A+
          </button>
          <button
            type="button"
            onClick={() => onFamilyChange('serif')}
            className={`${BUTTON_CLASS} ${settings.fontFamily === 'serif' ? 'border-brand-500 text-brand-600 dark:border-sky-400 dark:text-sky-300' : ''}`}
          >
            Serif
          </button>
          <button
            type="button"
            onClick={() => onFamilyChange('sans')}
            className={`${BUTTON_CLASS} ${settings.fontFamily === 'sans' ? 'border-brand-500 text-brand-600 dark:border-sky-400 dark:text-sky-300' : ''}`}
          >
            Sans-serif
          </button>
          <button type="button" onClick={onToggleTheme} className={BUTTON_CLASS}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button type="button" onClick={onBookmark} className="inline-flex items-center justify-center rounded-full bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-500">
            Save bookmark
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Font size:</span> {settings.fontSize}px
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Jump to chapter</span>
            <select
              className="min-w-[220px] rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={currentChapterSlug}
              onChange={(event) => onJumpToChapter(event.target.value)}
            >
              {chapterOptions.map((chapter) => (
                <option key={chapter.slug} value={chapter.slug}>
                  Chapter {chapter.chapterNumber}: {chapter.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
