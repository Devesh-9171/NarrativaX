const slugify = require('slugify');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');

exports.createBook = async (req, res) => {
  const data = req.body;
  const book = await Book.create({
    ...data,
    slug: slugify(data.title, { lower: true, strict: true }),
    coverImage: req.file ? `/uploads/${req.file.filename}` : data.coverImage
  });
  res.status(201).json(book);
};

exports.updateBook = async (req, res) => {
  const data = req.body;
  if (data.title) data.slug = slugify(data.title, { lower: true, strict: true });
  if (req.file) data.coverImage = `/uploads/${req.file.filename}`;
  const book = await Book.findByIdAndUpdate(req.params.bookId, data, { new: true });
  res.json(book);
};

exports.addChapter = async (req, res) => {
  const book = await Book.findById(req.params.bookId);
  if (!book) return res.status(404).json({ message: 'Book not found' });

  const chapter = await Chapter.create({
    ...req.body,
    bookId: book._id,
    slug: slugify(req.body.title || `chapter-${req.body.chapterNumber}`, { lower: true, strict: true })
  });
  res.status(201).json(chapter);
};

exports.dashboardStats = async (_req, res) => {
  const [totalBooks, totalChapters, totalViews, topBooks] = await Promise.all([
    Book.countDocuments(),
    Chapter.countDocuments(),
    Book.aggregate([{ $group: { _id: null, views: { $sum: '$totalViews' } } }]),
    Book.find().sort({ totalViews: -1 }).limit(5)
  ]);

  res.json({
    totalBooks,
    totalChapters,
    totalViews: totalViews[0]?.views || 0,
    topBooks
  });
};
