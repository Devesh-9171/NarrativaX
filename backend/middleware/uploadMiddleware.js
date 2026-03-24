const multer = require('multer');

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WEBP image files are allowed'));
    }

    return cb(null, true);
  }
});

function uploadSingleImage(fieldName) {
  return imageUpload.single(fieldName);
}

module.exports = {
  MAX_IMAGE_SIZE_BYTES,
  uploadSingleImage
};
