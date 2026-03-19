const BlogPost = require('../models/BlogPost');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { cache, cacheKey } = require('../utils/cache');

const BLOG_LIST_SELECT = 'title slug description coverImage publishedAt createdAt updatedAt';
const BLOG_SORT = { publishedAt: -1, createdAt: -1, _id: -1 };

exports.getBlogPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 12, maxLimit: 100 });
  const key = cacheKey(['blog-posts', page, limit]);
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const [posts, total] = await Promise.all([
    BlogPost.find()
      .sort(BLOG_SORT)
      .skip(skip)
      .limit(limit)
      .select(BLOG_LIST_SELECT)
      .lean(),
    BlogPost.countDocuments()
  ]);

  const payload = {
    success: true,
    data: posts,
    message: posts.length === 0 ? 'No blog posts yet' : undefined,
    pagination: buildPaginationMeta({ total, page, limit })
  };

  cache.set(key, payload);
  res.json(payload);
});

exports.getLatestBlogPosts = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 4, 1), 12);
  const key = cacheKey(['latest-blog-posts', limit]);
  const cached = cache.get(key);
  if (cached) return res.json(cached);

  const posts = await BlogPost.find()
    .sort(BLOG_SORT)
    .limit(limit)
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
