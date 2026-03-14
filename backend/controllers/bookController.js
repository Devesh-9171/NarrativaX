const Book = require('../models/Book');
const Chapter = require('../models/Chapter');

function computeTrendingScore(book) {
  return book.viewsLast24h * 3 + book.viewsLast7d * 2 + book.totalViews;
}

exports.getHomepage = async (_req, res) => {
  const [featured, trending, latestChapters, popular, categories] = await Promise.all([
    Book.find({ featured: true }).sort({ updatedAt: -1 }).limit(6),
    Book.find().sort({ trendingScore: -1 }).limit(8),
    Chapter.find().sort({ updatedAt: -1 }).limit(10).populate('bookId', 'title slug coverImage author'),
    Book.find().sort({ totalViews: -1 }).limit(8),
    Book.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
  ]);

  res.json({ featured, trending, latestChapters, popular, categories });
};

exports.getBooks = async (req, res) => {
  const { search = '', category, sort = 'updatedAt' } = req.query;
  const query = {};
  if (category) query.category = category;
  if (search) query.$text = { $search: search };

  const sortMap = {
    updatedAt: { updatedAt: -1 },
    popular: { totalViews: -1 },
    trending: { trendingScore: -1 },
    rating: { rating: -1 }
  };

  const books = await Book.find(query).sort(sortMap[sort] || sortMap.updatedAt).limit(50);
  res.json(books);
};

exports.getBookBySlug = async (req, res) => {
  const book = await Book.findOne({ slug: req.params.slug });
  if (!book) return res.status(404).json({ message: 'Book not found' });

  const chapters = await Chapter.find({ bookId: book._id }).sort({ chapterNumber: 1 });
  res.json({ book, chapters });
};

exports.getCategoryBooks = async (req, res) => {
  const books = await Book.find({ category: req.params.slug }).sort({ totalViews: -1 });
  res.json(books);
};

exports.recalculateTrending = async (_req, res) => {
  const books = await Book.find();
  await Promise.all(
    books.map((book) => {
      book.trendingScore = computeTrendingScore(book);
      return book.save();
    })
  );

  res.json({ message: 'Trending scores updated' });
};
