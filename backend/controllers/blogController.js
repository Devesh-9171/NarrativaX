const BlogPost = require('../models/BlogPost');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { cache, cacheKey } = require('../utils/cache');

const BLOG_LIST_SELECT = 'title slug description coverImage publishedAt createdAt updatedAt';
const BLOG_SORT = { publishedAt: -1, createdAt: -1, _id: -1 };
const LATEST_POSTS_LIMIT = 4;

exports.getBlogPosts = asyncHandler(async (_req, res) => {
  const key = cacheKey(['blog-posts']);
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const posts = await BlogPost.find()
    .sort(BLOG_SORT)
    .select(BLOG_LIST_SELECT)
    .lean();

  const payload = {
    success: true,
    data: posts,
    message: posts.length === 0 ? 'No blog posts yet' : undefined
  };

  cache.set(key, payload);
  res.json(payload);
});

exports.getLatestBlogPosts = asyncHandler(async (_req, res) => {
  const key = cacheKey(['latest-blog-posts', LATEST_POSTS_LIMIT]);
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const posts = await BlogPost.find()
    .sort(BLOG_SORT)
    .limit(LATEST_POSTS_LIMIT)
    .select(BLOG_LIST_SELECT)
    .lean();

  const payload = {
    success: true,
    data: posts,
    message: posts.length === 0 ? 'No blog posts yet' : undefined
  };

  cache.set(key, payload);
  res.json(payload);
});

exports.getBlogPostBySlug = asyncHandler(async (req, res) => {
  const key = cacheKey(['blog-post', req.params.slug]);
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const post = await BlogPost.findOne({ slug: req.params.slug }).lean();
  if (!post) throw new AppError('Blog post not found', 404);

  const payload = { success: true, post };
  cache.set(key, payload);
  res.json(payload);
});
