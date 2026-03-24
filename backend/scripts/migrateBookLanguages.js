/* eslint-disable no-console */
const mongoose = require('mongoose');
const config = require('../config');
const Book = require('../models/Book');

async function run() {
  await mongoose.connect(config.mongoUri);

  const result = await Book.updateMany(
    {
      $or: [
        { language: { $exists: false } },
        { language: null },
        { language: '' }
      ]
    },
    {
      $set: { language: 'english' }
    }
  );

  console.log(`Migration complete. Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Language migration failed:', error);
  try {
    await mongoose.disconnect();
  } catch (_e) {
    // ignore
  }
  process.exit(1);
});
