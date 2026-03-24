const cloudinary = require('../config/cloudinary');
const AppError = require('./AppError');

const VALID_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function assertValidImageFile(file) {
  if (!file) {
    throw new AppError('Image file is required', 400);
  }

  if (!VALID_IMAGE_TYPES.has(file.mimetype)) {
    throw new AppError('Only JPG, PNG, and WEBP image files are allowed', 400);
  }
}

function uploadImageBuffer({ file, folder }) {
  assertValidImageFile(file);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ fetch_format: 'auto', quality: 'auto' }]
      },
      (error, result) => {
        if (error || !result?.secure_url || !result?.public_id) {
          reject(new AppError('Image upload to Cloudinary failed', 502));
          return;
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    uploadStream.end(file.buffer);
  });
}

async function deleteImageByPublicId(publicId) {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.error(`Failed to delete Cloudinary image: ${publicId}`, error);
  }
}

module.exports = {
  VALID_IMAGE_TYPES,
  assertValidImageFile,
  uploadImageBuffer,
  deleteImageByPublicId
};
