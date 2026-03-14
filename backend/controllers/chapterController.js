const Book = require('../models/Book');
const Chapter = require('../models/Chapter');

exports.getChapter = async (req, res) => {
  const { slug, chapterSlug } = req.params;
  const book = await Book.findOne({ slug });
  if (!book) return res.status(404).json({ message: 'Book not found' });

  const chapter = await Chapter.findOne({ bookId: book._id, slug: chapterSlug });
  if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

  chapter.views += 1;
  await chapter.save();

  book.totalViews += 1;
  book.viewsLast24h += 1;
  book.viewsLast7d += 1;
  book.trendingScore = book.viewsLast24h * 3 + book.viewsLast7d * 2 + book.totalViews;
  await book.save();

  const [previousChapter, nextChapter] = await Promise.all([
    Chapter.findOne({ bookId: book._id, chapterNumber: chapter.chapterNumber - 1 }),
    Chapter.findOne({ bookId: book._id, chapterNumber: chapter.chapterNumber + 1 })
  ]);

  res.json({ book, chapter, previousChapter, nextChapter });
};
