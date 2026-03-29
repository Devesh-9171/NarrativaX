import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import SeoHead from '../../components/SeoHead';
import AdSlot from '../../components/AdSlot';
import api from '../../utils/api';
import { buildMeta } from '../../utils/seo';
import { useAuth } from '../../context/AuthContext';
import ContentReportMenu from '../../components/ContentReportMenu';

const HISTORY_KEY = 'short-story-history-v1';
const SESSION_CACHE_KEY = 'short-story-session-cache-v1';
const PRELOAD_AHEAD = 2;
const PREPARE_THRESHOLD = 88;
const AUTO_NEXT_DELAY_MS = 1000;
const STORY_CACHE_SIZE = 6;

function parseStoredArray(key) {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
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

function mergeStories(existingStories, incomingStories) {
  const map = new Map((existingStories || []).map((story) => [story._id, story]));
  for (const story of incomingStories || []) {
    if (!story?._id) continue;
    if (!map.has(story._id)) map.set(story._id, story);
  }
  return Array.from(map.values());
}

export default function ShortStoryReelPage({ stories, slug }) {
  const router = useRouter();
  const { token } = useAuth();
  const scrollerRef = useRef(null);
  const completionRef = useRef({});
  const autoAdvanceRef = useRef(false);
  const autoAdvanceTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const fetchInFlightRef = useRef(false);
  const [history, setHistory] = useState([]);
  const [storyFeed, setStoryFeed] = useState(Array.isArray(stories) ? stories : []);
  const [activeSlug, setActiveSlug] = useState(slug || stories?.[0]?.slug || null);
  const [sessionTrail, setSessionTrail] = useState([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMoreStories, setHasMoreStories] = useState(true);
  const [fetchErrorMessage, setFetchErrorMessage] = useState('');
  const [preparedNextSlug, setPreparedNextSlug] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);

  useEffect(() => {
    setStoryFeed((prev) => mergeStories(prev, Array.isArray(stories) ? stories : []));
  }, [stories]);

  useEffect(() => {
    if (!slug) return;
    setActiveSlug((prev) => prev || slug);
  }, [slug]);

  const currentStory = useMemo(
    () => storyFeed.find((story) => story.slug === activeSlug) || storyFeed.find((story) => story.slug === slug) || storyFeed[0] || null,
    [activeSlug, slug, storyFeed]
  );
  const rankedStories = useMemo(() => rankStories(storyFeed, currentStory, history), [storyFeed, currentStory, history]);
  const nextStory = rankedStories[0] || null;
  const previousStory = useMemo(() => {
    const index = sessionTrail.lastIndexOf(currentStory?.slug);
    if (index > 0) {
      const previousSlug = sessionTrail[index - 1];
      return storyFeed.find((story) => story.slug === previousSlug) || null;
    }
    return null;
  }, [currentStory?.slug, sessionTrail, storyFeed]);

  const fetchMoreStories = useCallback(async ({ retries = 1, fallbackToTrending = true } = {}) => {
    if (fetchInFlightRef.current || isFetchingMore || !hasMoreStories) return;
    fetchInFlightRef.current = true;
    setIsFetchingMore(true);
    setFetchErrorMessage('');
    try {
      const excludeStoryIds = storyFeed.map((story) => story._id).filter(Boolean).join(',');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const response = await api.get('/books/short-stories/reel', {
        ...config,
        params: { limit: 4, excludeStoryIds }
      });
      const incoming = response.data?.stories || [];
      if (incoming.length === 0) {
        setHasMoreStories(false);
      } else {
        setStoryFeed((prev) => mergeStories(prev, incoming));
      }
    } catch (_error) {
      if (retries > 0) {
        window.setTimeout(() => {
          fetchMoreStories({ retries: retries - 1, fallbackToTrending });
        }, 500);
      } else if (fallbackToTrending) {
        setFetchErrorMessage('Loading next story...');
        try {
          const response = await api.get('/books/short-stories/reel', { params: { limit: 3 } });
          const incoming = response.data?.stories || [];
          setStoryFeed((prev) => mergeStories(prev, incoming));
          if (incoming.length === 0) setHasMoreStories(false);
          setFetchErrorMessage('');
        } catch (_fallbackError) {
          setFetchErrorMessage('Loading next story...');
          setHasMoreStories(false);
        }
      }
    } finally {
      fetchInFlightRef.current = false;
      setIsFetchingMore(false);
    }
  }, [hasMoreStories, isFetchingMore, storyFeed, token]);

  const transitionToStory = useCallback((targetSlug) => {
    if (!targetSlug || targetSlug === currentStory?.slug || isTransitioning) return;
    setIsTransitioning(true);
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      setActiveSlug(targetSlug);
      setPreparedNextSlug(null);
      setShowInterstitial(false);
      router.replace(`/short-stories/${targetSlug}`, undefined, { shallow: true });
      if (scrollerRef.current) scrollerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => setIsTransitioning(false), 180);
    }, 140);
  }, [currentStory?.slug, isTransitioning, router]);

  const onRequestNextStory = useCallback(() => {
    if (!nextStory) {
      if (!isFetchingMore && hasMoreStories) fetchMoreStories({ retries: 1, fallbackToTrending: true });
      return;
    }
    setShowInterstitial(true);
    if (autoAdvanceTimerRef.current) window.clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = window.setTimeout(() => transitionToStory(nextStory.slug), AUTO_NEXT_DELAY_MS);
  }, [fetchMoreStories, hasMoreStories, isFetchingMore, nextStory, transitionToStory]);

  useEffect(() => () => {
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    if (autoAdvanceTimerRef.current) window.clearTimeout(autoAdvanceTimerRef.current);
  }, []);

  useEffect(() => {
    let cancelledRequest = false;
    const fetchPersonalizedFeed = async () => {
      if (!token) return;
      try {
        const response = await api.get('/books/short-stories/reel', {
          params: { limit: 5 },
          headers: { Authorization: `Bearer ${token}` }
        });
        if (cancelledRequest) return;
        setStoryFeed((prev) => mergeStories(prev, response.data?.stories || []));
      } catch (_error) {
        // Keep SSR feed as fallback when personalized query fails.
      }
    };

    fetchPersonalizedFeed();
    return () => {
      cancelledRequest = true;
    };
  }, [token]);

  useEffect(() => {
    const localHistory = parseStoredArray(HISTORY_KEY);
    setHistory(localHistory);
    const savedTrail = parseStoredArray(SESSION_CACHE_KEY).map((item) => item.slug).filter(Boolean);
    setSessionTrail(savedTrail);
  }, []);

  useEffect(() => {
    if (!currentStory || typeof window === 'undefined') return;
    const existingHistory = parseStoredArray(HISTORY_KEY).filter((item) => item.slug !== currentStory.slug);
    const nextHistory = [{ slug: currentStory.slug, tags: currentStory.tags || [], readingTimeMinutes: currentStory.readingTimeMinutes }, ...existingHistory].slice(0, 120);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    setHistory(nextHistory);

    const existingTrail = parseStoredArray(SESSION_CACHE_KEY).filter((item) => item.slug !== currentStory.slug);
    const nextTrail = [{ slug: currentStory.slug, story: currentStory }, ...existingTrail].slice(0, STORY_CACHE_SIZE);
    window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(nextTrail));
    setSessionTrail(nextTrail.map((item) => item.slug));
  }, [currentStory]);

  useEffect(() => {
    if (!nextStory) return;
    router.prefetch(`/short-stories/${nextStory.slug}`);
    if (rankedStories[1]) router.prefetch(`/short-stories/${rankedStories[1].slug}`);
  }, [nextStory, rankedStories, router]);

  useEffect(() => {
    if (!currentStory?._id) return;
    const currentIndex = storyFeed.findIndex((story) => story._id === currentStory._id);
    const remainingStories = currentIndex >= 0 ? storyFeed.length - currentIndex - 1 : rankedStories.length;
    if (remainingStories <= PRELOAD_AHEAD && hasMoreStories && !isFetchingMore) {
      fetchMoreStories({ retries: 1, fallbackToTrending: true });
    }
  }, [currentStory?._id, fetchMoreStories, hasMoreStories, isFetchingMore, rankedStories.length, storyFeed]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || !currentStory) return undefined;

    const markStoryRead = async (progressValue) => {
      if (!currentStory?._id || completionRef.current[currentStory._id]) return;
      if (progressValue < 70) return;
      completionRef.current[currentStory._id] = true;
      try {
        await api.post('/short-stories/complete-view', {
          shortStoryId: currentStory._id,
          progress: progressValue,
          status: 'read'
        }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      } catch (_error) {
        completionRef.current[currentStory._id] = false;
      }
    };

    const onScroll = () => {
      const maxScrollable = Math.max(node.scrollHeight - node.clientHeight, 1);
      const currentProgress = Math.min(100, Math.max(0, Math.round((node.scrollTop / maxScrollable) * 100)));
      const gapToBottom = node.scrollHeight - node.scrollTop - node.clientHeight;

      if (currentProgress >= 70 || gapToBottom <= 2) {
        markStoryRead(gapToBottom <= 2 ? 100 : currentProgress);
      }

      if (currentProgress >= PREPARE_THRESHOLD && nextStory?.slug) {
        setPreparedNextSlug(nextStory.slug);
      }

      if (gapToBottom <= 2 && !autoAdvanceRef.current) {
        autoAdvanceRef.current = true;
        onRequestNextStory();
      }

      if (node.scrollTop <= 0 && previousStory && preparedNextSlug && preparedNextSlug !== previousStory.slug) {
        setPreparedNextSlug(previousStory.slug);
      }
    };

    autoAdvanceRef.current = false;
    node.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => node.removeEventListener('scroll', onScroll);
  }, [currentStory, nextStory?.slug, onRequestNextStory, preparedNextSlug, previousStory, token]);

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
        <div className="flex items-center gap-2">
          {previousStory && (
            <button
              type="button"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
              onClick={() => transitionToStory(previousStory.slug)}
            >
              Previous Story
            </button>
          )}
          {nextStory && (
            <button
              type="button"
              className="rounded-full bg-brand-600 px-4 py-2 text-sm text-white"
              onClick={() => transitionToStory(nextStory.slug)}
            >
              Next
            </button>
          )}
          <ContentReportMenu contentId={currentStory._id} contentType="shortStory" />
        </div>
      </section>

      <article
        ref={scrollerRef}
        className="relative h-[72vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', contain: 'content' }}
      >
        <div className={`transition-all duration-200 will-change-transform ${isTransitioning ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}>
          {(currentStory.firstChapter?.content || '').split(/\n+/).filter(Boolean).map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 16)}`} className="pb-4 text-base leading-8 text-slate-700 dark:text-slate-200">
              {paragraph}
            </p>
          ))}
        </div>

        {nextStory && (
          <div className="pointer-events-none mt-8 border-t border-dashed border-slate-300 pt-5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400" aria-hidden="true">
            <p className="uppercase tracking-[0.2em]">Up next</p>
            <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{nextStory.title}</p>
            <p className="line-clamp-2 pt-2">{nextStory.description || 'Prepared in background for instant reading continuation.'}</p>
          </div>
        )}
      </article>

      {showInterstitial && (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/90">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Story break</p>
          <p className="mt-1 text-sm font-semibold">Next story is ready</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Continuing in a moment…</p>
          <AdSlot className="mt-3 min-h-[120px]" label="Story Reel Ad" />
        </div>
      )}

      {!showInterstitial && fetchErrorMessage && (
        <div className="fixed inset-x-4 bottom-4 z-30 mx-auto max-w-sm rounded-xl bg-slate-900/90 px-4 py-2 text-center text-xs text-white">
          {fetchErrorMessage}
        </div>
      )}

      {preparedNextSlug && nextStory?.slug === preparedNextSlug && (
        <div className="fixed right-4 top-24 z-20 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg">
          Next ready
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <p>Continuous reel mode is active.</p>
        {nextStory && (
          <Link href={`/short-stories/${nextStory.slug}`} className="font-semibold text-brand-600 dark:text-sky-300">
            Open next manually
          </Link>
        )}
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const { data } = await api.get('/books/short-stories/reel', { params: { limit: 3 } });
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
