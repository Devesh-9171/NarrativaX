const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const BlogPost = require('../models/BlogPost');
const asyncHandler = require('../utils/asyncHandler');

exports.getSitemapPayload = asyncHandler(async (_req, res) => {
  const [books, chapters, blogPosts] = await Promise.all([
    Book.find()
      .sort({ groupId: 1, language: 1, updatedAt: -1, _id: 1 })
      .select('slug language groupId updatedAt')
      .lean(),
    Chapter.find()
      .sort({ bookId: 1, chapterNumber: 1, updatedAt: -1, _id: 1 })
      .select('bookId slug chapterNumber language updatedAt')
      .lean(),
    BlogPost.find()
      .sort({ publishedAt: -1, updatedAt: -1, _id: -1 })
      .select('slug publishedAt updatedAt')
      .lean()
  ]);

  const chaptersByBookId = new Map();
  for (const chapter of chapters) {
    const key = String(chapter.bookId);
    const existing = chaptersByBookId.get(key) || [];
    existing.push({
      slug: chapter.slug,
      chapterNumber: chapter.chapterNumber,
      language: chapter.language,
      updatedAt: chapter.updatedAt
    });
    chaptersByBookId.set(key, existing);
  }

  const payload = {
    success: true,
    generatedAt: new Date().toISOString(),
    books: books.map((book) => ({
      id: String(book._id),
      slug: book.slug,
      language: book.language,
      groupId: book.groupId || String(book._id),
      updatedAt: book.updatedAt,
      chapters: chaptersByBookId.get(String(book._id)) || []
    })),
    blogPosts: blogPosts.map((post) => ({
      slug: post.slug,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt
    }))
  };

  res.set('Cache-Control', 'no-store, max-age=0');
  res.json(payload);
});
