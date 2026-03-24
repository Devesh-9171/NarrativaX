import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import SeoHead from '../../components/SeoHead';
import api from '../../utils/api';
import { buildMeta } from '../../utils/seo';

const HISTORY_KEY = 'short-story-history-v1';
const COUNTDOWN_SECONDS = 3;

function parseHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function rankStories(stories, currentStory, history) {
  if (!currentStory) return [];
  const historyMap = new Map(history.map((item) => [item.slug, item]));
  const averageReadTime = history.length > 0
    ? history.reduce((sum, item) => sum + (Number(item.readingTimeMinutes) || 0), 0) / history.length
    : Number(currentStory.readingTimeMinutes) || 2;

  const preferredLength = averageReadTime <= 4 ? 'short' : 'long';
  const tagWeight = new Map();
  for (const item of history) {
    for (const tag of item.tags || []) {
      tagWeight.set(tag, (tagWeight.get(tag) || 0) + 1);
    }
  }

  return stories
    .filter((story) => story.slug !== currentStory.slug)
    .map((story) => {
      const storyReadTime = Number(story.readingTimeMinutes) || 1;
      const lengthScore = preferredLength === 'short'
        ? Math.max(0, 8 - storyReadTime)
        : Math.min(8, storyReadTime);
      const tagsScore = (story.tags || []).reduce((sum, tag) => sum + (tagWeight.get(tag) || 0), 0);
      const unreadBoost = historyMap.has(story.slug) ? -20 : 18;
      return { ...story, recommendationScore: unreadBoost + tagsScore * 2 + lengthScore };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore);
}

export default function ShortStoryReelPage({ stories, slug }) {
  const router = useRouter();
  const scrollerRef = useRef(null);
  const [showNextPopup, setShowNextPopup] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [cancelled, setCancelled] = useState(false);
  const [history, setHistory] = useState([]);

  const currentStory = useMemo(() => stories.find((story) => story.slug === slug) || stories[0] || null, [slug, stories]);
  const rankedStories = useMemo(() => rankStories(stories, currentStory, history), [stories, currentStory, history]);
  const previousStory = useMemo(() => {
    const currentIndex = history.findIndex((entry) => entry.slug === currentStory?.slug);
    if (currentIndex > 0) return stories.find((story) => story.slug === history[currentIndex - 1].slug) || null;
    return null;
  }, [currentStory?.slug, history, stories]);
  const nextStory = rankedStories[0] || null;

  useEffect(() => {
    setHistory(parseHistory());
  }, []);

  useEffect(() => {
    if (!currentStory || typeof window === 'undefined') return;
    const existing = parseHistory().filter((item) => item.slug !== currentStory.slug);
    const nextHistory = [{ slug: currentStory.slug, tags: currentStory.tags || [], readingTimeMinutes: currentStory.readingTimeMinutes }, ...existing].slice(0, 120);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    setHistory(nextHistory);
  }, [currentStory]);

  useEffect(() => {
    if (!nextStory) return;
    router.prefetch(`/short-stories/${nextStory.slug}`);
    if (rankedStories[1]) router.prefetch(`/short-stories/${rankedStories[1].slug}`);
  }, [nextStory, rankedStories, router]);

  useEffect(() => {
    setShowNextPopup(false);
    setCountdown(COUNTDOWN_SECONDS);
    setCancelled(false);
  }, [currentStory?.slug]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || !currentStory || cancelled) return undefined;

    const onScroll = () => {
      const gapToBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
      if (gapToBottom <= 48) setShowNextPopup(true);
    };

    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [currentStory, cancelled]);

  useEffect(() => {
    if (!showNextPopup || cancelled || !nextStory) return undefined;
    if (countdown <= 0) {
      router.push(`/short-stories/${nextStory.slug}`);
      return undefined;
    }
    const timer = window.setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, showNextPopup, cancelled, nextStory, router]);

  const meta = buildMeta({
    title: currentStory ? `${currentStory.title} | Short Stories | ReadNovaX` : 'Short Stories | ReadNovaX',
    description: currentStory?.firstChapter?.content?.slice(0, 160) || 'Swipe-friendly short story reels.',
    path: currentStory ? `/short-stories/${currentStory.slug}` : '/short-stories'
  });

  if (!currentStory) {
    return (
      <Layout>
        <SeoHead {...meta} />
        <section className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Short stories are loading right now.
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <SeoHead {...meta} />
      <section className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-sky-300">Short Stories</p>
          <h1 className="text-2xl font-semibold">{currentStory.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">#{(currentStory.tags || []).join(' #') || 'story'} · {currentStory.wordCount} words · {currentStory.readingTimeMinutes} min read</p>
        </div>
        <div className="flex gap-2">
          {previousStory && <Link href={`/short-stories/${previousStory.slug}`} className="rounded-full border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Previous Story</Link>}
          {nextStory && <Link href={`/short-stories/${nextStory.slug}`} className="rounded-full bg-brand-600 px-4 py-2 text-sm text-white">Next</Link>}
        </div>
      </section>

      <article
        ref={scrollerRef}
        className="relative h-[72vh] snap-y snap-mandatory overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
      >
        {(currentStory.firstChapter.content || '').split(/\n+/).filter(Boolean).map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 16)}`} className="snap-start pb-4 text-base leading-8 text-slate-700 dark:text-slate-200">
            {paragraph}
          </p>
        ))}
      </article>

      {showNextPopup && nextStory && (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/90">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Next Story</p>
          <p className="mt-1 text-sm font-semibold">{nextStory.title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Auto-playing in {Math.max(countdown, 0)}s</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-700"
              onClick={() => setCancelled(true)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-brand-600 px-4 py-1.5 text-sm text-white"
              onClick={() => router.push(`/short-stories/${nextStory.slug}`)}
            >
              Next now
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const { data } = await api.get('/books/short-stories/reel', { params: { limit: 36 } });
    const stories = data?.stories || [];
    if (stories.length === 0) return { props: { stories: [], slug: params.slug || null } };
    const existing = stories.find((story) => story.slug === params.slug);
    if (!existing) {
      return {
        redirect: {
          destination: `/short-stories/${stories[0].slug}`,
          permanent: false
        }
      };
    }
    return { props: { stories, slug: params.slug } };
  } catch (_error) {
    return { props: { stories: [], slug: params.slug || null } };
  }
}
