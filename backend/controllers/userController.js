const User = require('../models/User');

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('bookmarks')
    .populate('favoriteBooks')
    .populate('readingHistory.bookId readingHistory.chapterId');
  res.json(user);
};

exports.toggleBookmark = async (req, res) => {
  const user = await User.findById(req.user.id);
  const chapterId = req.params.chapterId;
  const index = user.bookmarks.findIndex((id) => id.toString() === chapterId);
  if (index >= 0) user.bookmarks.splice(index, 1);
  else user.bookmarks.push(chapterId);
  await user.save();
  res.json({ bookmarks: user.bookmarks });
};

exports.toggleFavoriteBook = async (req, res) => {
  const user = await User.findById(req.user.id);
  const bookId = req.params.bookId;
  const index = user.favoriteBooks.findIndex((id) => id.toString() === bookId);
  if (index >= 0) user.favoriteBooks.splice(index, 1);
  else user.favoriteBooks.push(bookId);
  await user.save();
  res.json({ favoriteBooks: user.favoriteBooks });
};

exports.saveReadingProgress = async (req, res) => {
  const { bookId, chapterId, progress } = req.body;
  const user = await User.findById(req.user.id);
  const existing = user.readingHistory.find((item) => item.chapterId.toString() === chapterId);

  if (existing) {
    existing.progress = progress;
    existing.lastReadAt = new Date();
  } else {
    user.readingHistory.push({ bookId, chapterId, progress });
  }

  await user.save();
  res.json({ readingHistory: user.readingHistory });
};
